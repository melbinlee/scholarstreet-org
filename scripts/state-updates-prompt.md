Scholar Street state §25F status updates
Instructions

WHAT THIS IS
scholarstreet.org's News page (news.html) opens with a table of every state's
status in the federal Education Freedom Tax Credit (IRC §25F). All of its data
lives in one file:
  C:\Users\msisa\Documents\scholarstreet-org\state-status-data.js
Read that file's top comments first. They define every field, the sources, and
the status rules below. Follow the file's existing format exactly. Don't edit
any other file.

Above the table the page says "Updated <date> · Checked for changes every
Monday and Thursday". That date is window.SS_UPDATED in the same file. It
must only move forward when data actually changes (step 7).

SEARCH TERMS
Every news search in this run uses all of these phrases, joined with OR:
  "Education Freedom Tax Credit"
  "federal scholarship tax credit"
  "scholarship tax credit"
  "tax credit scholarship"
  "school choice tax credit"
  25F

EACH RUN

1. Setup: in the repo folder, run `git checkout main` then `git pull`. If the
   folder has uncommitted changes, stop and report; don't touch them.
   Then check for an open pull request whose branch starts with
   "state-updates/" (gh pr list --state open). If one exists, check out that
   branch and work on top of it: add today's changes as a new commit, push,
   and comment on that PR listing what's new. Only create a fresh branch from
   main when no state-updates PR is open.

2. Check these four sources:
   a) The IRS participating-states list, and its "as of" date:
      https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc
   b) The "Latest news" timeline on Ballotpedia's tracker, and its "as of" date:
      https://ballotpedia.org/State_participation_in_the_federal_K-12_education_tax_credit_program
      Ballotpedia often returns an empty page to automated fetches. If it
      comes back empty, blocked, or without a "Latest news" section, fetch
      it again with a browser user-agent (e.g. curl -A "Mozilla/5.0 ...")
      or open it in the browser. Never treat an empty page as "nothing
      new". If you still can't read it, say so in the report and rely
      on the other sources for this run.
   c) National news from the past 7 days, from the Google News search feed:
      https://news.google.com/rss/search?q=<query>&hl=en-US&gl=US&ceid=US:en
      where <query> is the SEARCH TERMS joined with OR, followed by when:7d,
      URL-encoded. For example, unencoded:
      ("Education Freedom Tax Credit" OR "federal scholarship tax credit" OR "scholarship tax credit" OR "tax credit scholarship" OR "school choice tax credit" OR 25F) when:7d
   d) State-by-state news from the past 7 days, for EVERY state whose
      status in the file is not "opted-in" (currently 20 states). For each
      one, fetch the same Google News feed with this query, unencoded:
      ("<State name>" OR "<current governor's last name>") (<SEARCH TERMS joined with OR>) when:7d
      e.g. ("Washington" OR "Ferguson") ("Education Freedom Tax Credit" OR ... OR 25F) when:7d
      Run all of these on every run, Monday and Thursday.

   How to read the feeds (c and d): fetch with a browser user-agent. Each
   <item> has a title, a pubDate and a <source url> naming the outlet.
   Skip items older than 7 days. Skip items that aren't about that state
   (e.g. "Washington" meaning D.C., or a different state's program). For
   any item that may report something a governor, governor's office or
   legislature said or did, find the article itself on the outlet's site
   (the <link> is a Google redirect, not the article) and read it.
   Negative news counts as much as positive: a governor criticising the
   program, refusing, or stalling is a development to record.
   If a feed fails, fall back to ONE web search with the same terms plus the
   current month and year (e.g. "... October 2026"), ignore results older
   than 7 days, and say in the report that you used the fallback.
   (Ballotpedia's timeline can lag by months, so don't rely on it alone.)

   Compare all of this to the file:
   - Is any state on the IRS list that isn't "opted-in" in the file, or the
     other way around?
   - Does any source describe a development (a state and date) not yet in
     that state's updates?
   If nothing is new, and today isn't a Monday, STOP: report "No changes"
   and end the run.
   If nothing is new and it's a Monday, skip to step 6.

3. Research what's new. For each state flagged in step 2, find the primary
   source (governor's release, legislature bill page, IRS), then reputable
   news if there's no primary source. Don't search the 30 opted-in states
   unless one of the step 2 sources names them.

4. For each real development, add an entry to that state's `updates`.
   Real developments are: an opt-in, a veto, an override, a bill signed or
   passed, an opt-in bill introduced, and any public statement about the
   program by the sitting governor or their office, positive or negative
   (supports it, plans to opt in, is open to it, is waiting for rules,
   criticises it, refuses).
   - date = the date the event happened, not the article's date
   - text = one plain sentence in the file's existing style, e.g.
     "Gov. X says State will not participate."
     "Gov. X's office says she will decide once final federal rules are out."
     "Gov. X calls the program a threat to public schools."
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

5. Status (set it from the sitting governor's most recent statement or
   action, using these rules, which match the file's comments):
   - opted-in: only when the state is on the IRS list. Nothing else counts.
   - pending-warm: the governor or their office has said publicly the state
     will, plans to, or may opt in, or is open to or leaning toward opting
     in. Also: an opt-in law or veto override has passed but the state isn't
     on the IRS list yet.
   - pending-cold: no public commitment either way: undecided, waiting for
     federal rules or guidance, reviewing, or critical without declining.
     A governor who walks back an earlier warm statement goes back to cold.
   - not-participating: the governor has publicly declined, or vetoed
     opt-in legislation that wasn't overridden. A not-participating state
     moves to pending-warm only if the governor later says the state will
     or may opt in; neutral statements ("reviewing it again") leave it
     not-participating.
   - Only the sitting governor, their office, the legislature or the IRS can
     change a status. Statements by candidates, governors-elect, individual
     lawmakers, advocacy groups and op-ed writers never change a status.
     Record them in the PR's "Needs your call" if notable, not in `updates`.
   - When a statement is ambiguous between warm and cold, leave the status
     as it is and ask in "Needs your call", quoting the words used.
   - List every status change in the PR's change table with the exact words
     that justify it, so Scholar Street can confirm or reverse it.

6. Rules you must not break:
   - optInDate only for a dated formal action (executive order, IRS Form
     15714, formal announcement, veto override). Statements of intent go in
     updates, not optInDate.
   - Never invent a date, URL, name or number. If something isn't confirmed,
     leave it out and mention it in the PR.
   - If the article doesn't say when a statement was made, don't guess a
     date. Propose the update in "Needs your call" with the article's
     date and say the event date is unconfirmed.
   - If a governor changes (resignation, death, a new term), update
     currentGovernor and cite the source in the PR. An election doesn't
     change it: switch to the new governor only once they've been sworn
     in (most new governors take office in January 2027; the date varies
     by state). Until then, note governors-elect in "Needs your call".
     Also add a new governor to window.SS_GOVERNOR_LINKS at the bottom of
     the file, using the official governor's office website listed on
     their state's USA.gov page (https://www.usa.gov/states/<state-name>,
     e.g. /states/new-york). Open it and confirm it loads; if it
     redirects, use the final address.

7. Link check (Mondays only): open every credit.url in the file, every
   update url dated within the last 30 days, and every governor link in
   SS_GOVERNOR_LINKS. List any that no longer load, to go in the PR. Don't
   delete them. Some government sites block scripts (403, bot checks) but
   work in a browser. Only list a link if it also fails when you open it
   the way a person would. If this is the only thing that found anything,
   still open the PR (step 8) so the list gets seen.

8. If nothing changed and no links are broken, stop. No branch, no PR.
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
     • a table of every change: state, field, old value, new value, source
       URL, and for status changes the quoted words behind it
     • a "Needs your call" section: ambiguous warm/cold calls, conflicting
       sources, unconfirmed dates, notable statements by candidates or
       lawmakers, governors-elect
     • the broken-link list (Mondays)
     For an existing PR, add a comment with the same three sections for
     today's changes.
   - Netlify posts a preview link on the PR. Wait for it and include it in
     your report and email. The table is at <preview link>/news.html.

9. NEVER merge the PR, never push to main, and never deploy. A human reviews
   every change before it goes live.

10. If you opened or updated a pull request this run, email
   mel@scholarstreet.org from my Gmail with the subject
   "State table updates ready for review (YYYY-MM-DD)". Body: the same
   summary as your report, the PR link and the preview link to news.html.
   Send nothing on runs with no changes.

REPORT
End each run with a short summary: what changed (including any status
changes and why), the PR link and preview link (if any), what needs a
decision, and whether any source failed or a fallback was used.
