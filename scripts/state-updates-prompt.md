Scholar Street state §25F status updates
Instructions

WHAT THIS IS
scholarstreet.org's News page (news.html) opens with a table of every state's
status in the federal Education Freedom Tax Credit (IRC §25F). All of its data
lives in one file:
  C:\Users\msisa\Documents\scholarstreet-org\state-status-data.js
Read that file's top comments first. They define every field, the sources, and
the rules below. Follow the file's existing format exactly. Don't edit any
other file.

Above the table the page says "Updated <date> · Checked for changes every
Monday and Thursday". That date is window.SS_UPDATED in the same file. It
must only move forward when data actually changes (step 7).

EACH RUN

1. Setup: in the repo folder, run `git checkout main` then `git pull`. If the
   folder has uncommitted changes, stop and report; don't touch them.
   Then check for an open pull request whose branch starts with
   "state-updates/" (gh pr list --state open). If one exists, check out that
   branch and work on top of it: add today's changes as a new commit, push,
   and comment on that PR listing what's new. Only create a fresh branch from
   main when no state-updates PR is open.

2. Cheap check first. Look at only these three things:
   a) The IRS participating-states list, and its "as of" date:
      https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc
   b) The "Latest news" timeline on Ballotpedia's tracker, and its "as of" date:
      https://ballotpedia.org/State_participation_in_the_federal_K-12_education_tax_credit_program
      Ballotpedia often returns an empty page to automated fetches. If it
      comes back empty, blocked, or without a "Latest news" section, fetch
      it again with a browser user-agent (e.g. curl -A "Mozilla/5.0 ...")
      or open it in the browser. Never treat an empty page as "nothing
      new". If you still can't read it, say so in the report and rely
      on (a) and (c) for this run.
   c) News from the past 7 days, from the Google News search feed (dated
      and sorted, unlike a web search):
      https://news.google.com/rss/search?q=%22Education+Freedom+Tax+Credit%22+OR+%22federal+scholarship+tax+credit%22+OR+%22federal+tax+credit+scholarship%22+when:7d&hl=en-US&gl=US&ceid=US:en
      Fetch it with a browser user-agent. Each <item> has a title, a
      pubDate and a <source url> naming the outlet. Read the titles and
      skip op-eds, commentary, explainers, advocacy groups' own posts and
      anything that names no state. Most results will be these. For an
      item that may report a state action, find the article itself on the
      outlet's site (the <link> is a Google redirect, not the article)
      and read it.
      If the feed fails or is empty, fall back to ONE web search with the
      current month and year, e.g. for a run in October 2026:
      ("Education Freedom Tax Credit" OR "federal scholarship tax credit") opt in October 2026
      and ignore results older than 7 days. Say in the report that you
      used the fallback.
      (Ballotpedia's timeline can lag by months, so don't rely on it alone.)
   Compare them to the file:
   - Is any state on the IRS list that isn't "opted-in" in the file, or the
     other way around?
   - Does any Ballotpedia event or news result (a state and date) describe a
     development not yet in that state's updates?
   If nothing is new, and today isn't a Monday, STOP: report "No changes"
   and end the run, without searching further.
   If nothing is new and it's a Monday, skip to step 6.

3. Research only what's new. For each state flagged in step 2, and only those,
   find the primary source (governor's release, legislature bill page, IRS),
   then reputable news if there's no primary source. Don't search the 30
   opted-in states unless one of the step 2 sources names them.

4. For each real development (an opt-in, a veto, an override, a bill signed,
   a governor's public statement), add an entry to that state's `updates`:
   - date = the date the event happened, not the article's date
   - text = one plain sentence in the file's existing style, e.g.
     "Gov. X says State will not participate."
   - url = the primary source if one exists, otherwise a reputable news
     report. Open the URL and confirm it loads and says what the update
     claims. Skip paywalled or broken links, and keep the update with no url.
   - Don't add duplicates: skip an event that's already listed with the same
     state and date.
   - If Scholar Street published an article on scholarstreet.org/news about
     that state's news, prefer linking to it.
   For a state newly on the IRS list: set status "opted-in", set irsListed to
   the date of that list edition, and add the update "Added to the IRS list
   of participating states." linking to the IRS page.

5. Rules you must not break:
   - "opted-in" only when the state is on the IRS list. Nothing else counts.
   - "not-participating" only when the governor has publicly declined, or
     vetoed opt-in legislation that wasn't overridden.
   - Never change a state between pending-warm and pending-cold yourself.
     That's Scholar Street's editorial call. If news suggests a change,
     flag it in the PR (step 7) and leave the data as it is.
   - optInDate only for a dated formal action (executive order, IRS Form
     15714, formal announcement, veto override). Statements of intent go in
     updates, not optInDate.
   - Never invent a date, URL, name or number. If something isn't confirmed,
     leave it out and mention it in the PR.
   - Only a sitting governor, their office, the legislature or the IRS
     makes an update. Statements by candidates, governors-elect,
     individual lawmakers, advocacy groups and op-ed writers don't go in
     `updates`. Mention a notable one in the PR's "Needs your call".
   - If the article doesn't say when a statement was made, don't guess a
     date. Propose the update in "Needs your call" with the article's
     date and say the event date is unconfirmed.
   - If a governor changes (resignation, death, a new term), update
     currentGovernor and cite the source in the PR. An election doesn't
     change it: switch to the new governor only once they've been sworn
     in (most new governors take office in January 2027; the date varies
     by state). Until then, note governors-elect in "Needs your call". Also add them to
     window.SS_GOVERNOR_LINKS at the bottom of the file, using the official
     governor's office website listed on their state's USA.gov page
     (https://www.usa.gov/states/<state-name>, e.g. /states/new-york).
     Open it and confirm it loads; if it redirects, use the final address.

6. Link check (Mondays only): open every credit.url in the file, every
   update url dated within the last 30 days, and every governor link in
   SS_GOVERNOR_LINKS. List any that no longer load, to go in the PR. Don't
   delete them. Some government sites block scripts (403, bot checks) but
   work in a browser. Only list a link if it also fails when you open it
   the way a person would. If this is the only thing that found anything,
   still open the PR (step 7) so the list gets seen.

7. If nothing changed and no links are broken, stop. No branch, no PR.
   Report "No changes."
   Otherwise (on a new branch, or the open PR's branch from step 1):
   - new branch name: state-updates/YYYY-MM-DD, created from main
   - edit only state-status-data.js
   - whenever you actually change any state data (not for a links-only
     Monday check with no data changes), set window.SS_UPDATED to today's
     date. Never move it backward, and never touch it on a "No changes" run
     or a run where only the broken-link list was produced.
   - commit with a message listing each state changed
   - push the branch. For a new branch, open a DRAFT pull request against
     main with:
     • a table of every change: state, field, old value, new value, source URL
     • a "Needs your call" section: suggested Warm/Cold changes, conflicting
       sources, anything unconfirmed
     • the broken-link list (Mondays)
     For an existing PR, add a comment with the same three sections for
     today's changes.
   - Netlify posts a preview link on the PR. Wait for it and include it in
     your report and email. The table is at <preview link>/news.html.

8. NEVER merge the PR, never push to main, and never deploy. A human reviews
   every change before it goes live.

9. If you opened or updated a pull request this run, email
   mel@scholarstreet.org from my Gmail with the subject
   "State table updates ready for review (YYYY-MM-DD)". Body: the same
   summary as your report, the PR link and the preview link to news.html.
   Send nothing on runs with no changes.

REPORT
End each run with a short summary: what changed, the PR link and preview link
(if any), and what needs a decision.
