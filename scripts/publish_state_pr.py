#!/usr/bin/env python3
"""Publish the state-table job's pull request without a human review.

Since 2026-10-13 nobody reviews state-table updates before they go live
(Mel's decision). This script is the review that remains: it runs fixed
checks on the branch the job just pushed and merges the pull request only
if every one passes. Anything unusual is HELD: the pull request stays a
draft and the job's email asks for a look.

Run from the repo root, on the job's state-updates/* branch, after pushing:

    python scripts/publish_state_pr.py

Prints one of:
    PUBLISHED pr=#N merge=<sha> live=<yes|not confirmed>
    HELD: <reason>; <reason> ...
followed by STATUS CHANGE lines for the email. Exit code 0 only when
published. Standard library only; needs git, gh and node on PATH.
"""
import datetime as dt
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.request

DATA = 'state-status-data.js'
STATUSES = {'opted-in', 'pending-warm', 'pending-cold', 'not-participating', None}
MAX_STATUS_CHANGES = 3
DUMP = ("global.window={};require(process.argv[1]);"
        "console.log(JSON.stringify({states:window.SS_STATES,updated:window.SS_UPDATED,"
        "overrides:window.SS_STATUS_OVERRIDES||{}}))")


def run(*cmd, check=True):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', shell=False)
    if check and r.returncode != 0:
        raise RuntimeError(' '.join(cmd[:3]) + ' failed: ' + (r.stderr or r.stdout).strip()[:300])
    return r


def tool(name):
    # gh and node are .cmd/.exe shims on Windows; let the OS resolve them.
    import shutil
    path = shutil.which(name)
    if not path:
        raise RuntimeError(name + ' is not on PATH')
    return path


def load(path):
    out = run(tool('node'), '-e', DUMP, os.path.abspath(path)).stdout
    d = json.loads(out)
    return {s['code']: s for s in d['states']}, d['updated'], d['overrides']


def problems(old, old_updated, new, new_updated, overrides, today):
    held, changes = [], []
    if set(old) != set(new):
        held.append('the set of states changed')
        return held, changes
    data_changed = False
    for code in sorted(new):
        o, n = old[code], new[code]
        if n != o:
            data_changed = True
        if n['status'] not in STATUSES:
            held.append(code + ' has an unknown status ' + repr(n['status']))
        if n['status'] != o['status']:
            changes.append((code, o['status'], n['status']))
            if code in overrides:
                held.append(code + "'s status is a Scholar Street override (" + str(overrides[code]) +
                            ') and this run changes it to ' + str(n['status']))
            if n['status'] == 'opted-in' and not n.get('irsListed'):
                held.append(code + ' is set to opted-in without an IRS list date')
        if n['currentGovernor'] != o['currentGovernor']:
            held.append(code + "'s governor changed from " + str(o['currentGovernor']) + ' to ' + str(n['currentGovernor']))
        kept = {(u.get('date'), u.get('text')) for u in n['updates']}
        for u in o['updates']:
            if (u.get('date'), u.get('text')) not in kept:
                held.append(code + ' lost or reworded an existing update dated ' + str(u.get('date')))
        before = {(u.get('date'), u.get('text')) for u in o['updates']}
        for u in n['updates']:
            if (u.get('date'), u.get('text')) in before:
                continue
            date, text, url = u.get('date'), u.get('text'), u.get('url')
            if not isinstance(date, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', date):
                held.append(code + ' has an update with a malformed date')
            elif not '2025-01-01' <= date <= today:
                held.append(code + ' has an update dated ' + date + ', outside 2025-01-01 to today')
            if not isinstance(text, str) or len(text.strip()) < 15 or len(text) > 400:
                held.append(code + ' has an update with missing, very short or very long text')
            if url is not None and not (isinstance(url, str) and url.startswith('https://')):
                held.append(code + ' has an update whose link is not https')
    if len(changes) > MAX_STATUS_CHANGES:
        held.append(str(len(changes)) + ' states change status in one run (limit ' + str(MAX_STATUS_CHANGES) + ')')
    if new_updated < old_updated:
        held.append('SS_UPDATED moved backward')
    if new_updated > today:
        held.append('SS_UPDATED is in the future')
    if data_changed and new_updated != today:
        held.append('state data changed but SS_UPDATED is not today')
    if not data_changed and new_updated != old_updated:
        held.append('SS_UPDATED moved though no state data changed')
    return held, changes


def live_has(updated):
    for _ in range(12):
        try:
            url = 'https://scholarstreet.org/' + DATA + '?cb=' + str(int(time.time()))
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 state-job'})
            body = urllib.request.urlopen(req, timeout=20).read().decode('utf-8', 'replace')
            if "SS_UPDATED = '" + updated + "'" in body:
                return True
        except Exception:
            pass
        time.sleep(15)
    return False


def main():
    git, gh, node = tool('git'), tool('gh'), tool('node')
    today = dt.date.today().isoformat()
    held = []
    try:
        branch = run(git, 'rev-parse', '--abbrev-ref', 'HEAD').stdout.strip()
        if not branch.startswith('state-updates/'):
            print('HELD: not on a state-updates/ branch (on ' + branch + ')')
            return 1
        if run(git, 'status', '--porcelain').stdout.strip():
            held.append('the checkout has uncommitted changes')
        run(git, 'fetch', '-q', 'origin')
        if run(git, 'rev-parse', 'HEAD').stdout != run(git, 'rev-parse', 'origin/' + branch, check=False).stdout:
            held.append('the branch is not pushed, or differs from GitHub')
        prs = json.loads(run(gh, 'pr', 'list', '--head', branch, '--state', 'open', '--json', 'number,baseRefName').stdout)
        if len(prs) != 1 or prs[0]['baseRefName'] != 'main':
            print('HELD: expected exactly one open pull request from ' + branch + ' into main')
            return 1
        number = str(prs[0]['number'])

        files = run(git, 'diff', '--name-only', 'origin/main...HEAD').stdout.split()
        if files != [DATA]:
            held.append('the branch changes ' + (', '.join(files) or 'nothing') + '; only ' + DATA + ' may change')
        if run(node, '--check', DATA, check=False).returncode != 0:
            held.append(DATA + ' has a syntax error')
        if run(node, '--test', check=False).returncode != 0:
            held.append('the repo tests fail')

        if not held:
            with tempfile.TemporaryDirectory() as tmp:
                base = os.path.join(tmp, 'base.js')
                with open(base, 'w', encoding='utf-8', newline='') as f:
                    f.write(run(git, 'show', 'origin/main:' + DATA).stdout)
                old, old_updated, overrides = load(base)
            new, new_updated, _ = load(DATA)   # overrides come from main, so a run can't lift its own
            more, changes = problems(old, old_updated, new, new_updated, overrides, today)
            held += more
        else:
            changes = []
    except Exception as e:
        print('HELD: the checks could not run (' + str(e)[:300] + ')')
        return 1

    for code, was, now in changes:
        print('STATUS CHANGE ' + code + ': ' + str(was) + ' -> ' + str(now))
    if held:
        print('HELD: ' + '; '.join(held))
        return 1

    try:
        run(gh, 'pr', 'ready', number, check=False)
        run(gh, 'pr', 'merge', number, '--merge', '--delete-branch')
        state = json.loads(run(gh, 'pr', 'view', number, '--json', 'state,mergeCommit').stdout)
        if state['state'] != 'MERGED':
            print('HELD: the merge did not complete (pull request is ' + state['state'] + ')')
            return 1
        sha = (state.get('mergeCommit') or {}).get('oid', '')[:7]
        run(git, 'checkout', '-q', 'main', check=False)
        run(git, 'pull', '-q', '--ff-only', check=False)
    except Exception as e:
        print('HELD: publishing failed partway (' + str(e)[:300] + '); check pull request #' + number)
        return 1
    print('PUBLISHED pr=#' + number + ' merge=' + sha + ' live=' + ('yes' if live_has(new_updated) else 'not confirmed'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
