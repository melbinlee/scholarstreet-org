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
Don't add "25F": India's Industrial Disputes Act has a Section 25F whose
court rulings flood the results, and "Section 25F" in quotes breaks the
Google News query.

EACH RUN

1. Setup: in the repo folder, run `git checkout main` then `git pull`. If the
   folder has uncommitted changes, stop and report; don't touch them.
   Then check for an open pull request whose branch starts with
   "state-updates/" (gh pr list --state open). If one exists, check out that
   branch and work on top of it: add today's changes as a new commit, push,
   and comment on that PR listing what's new. Only create a fresh branch from
   main when no state-updates PR is open.

2. Check these sources:
   a) The IRS participating-states list, and its "as of" date (every run):
      https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc
   b) Ballotpedia's tracker, MONDAYS ONLY, as a backstop for vetoes,
      overrides and bills (its timeline lags by months, so it is never the
      main source):
      https://ballotpedia.org/State_participation_in_the_federal_K-12_education_tax_credit_program
      It returns 403 or an empty page to plain fetches. Fetch it with a
      browser user-agent (curl -A "Mozilla/5.0 ...") or open it in the
      browser. Never treat an empty page as "nothing new"; if you still
      can't read it, say so in the report.
   c) News, governor newsrooms and legislation, every run. In the repo
      folder run:
        python scripts/gnews.py
      It prints three sections, all for the past 7 days:
      - NEWS: Google News searched once nationally, then three times for
        EVERY state not "opted-in": the SEARCH TERMS; "voucher" and
        "school choice program" wording (much coverage calls the program a
        voucher); and quotes from the governor's office or spokesperson.
        Syndicated copies of one story are collapsed, so each number is a
        distinct story ("also:" lists the copies; "= see [n]" means it was
        already listed above).
      - GOVERNOR NEWSROOMS: each of those governors' own press releases.
        MATCH lines are releases about the program: open and read every
        one. States marked OPEN IN BROWSER (sites that block scripts or need
        JavaScript) and any FAILED or "NO DATES FOUND" line: open that
        newsroom in the browser and read the headlines from the past 7 days.
        If a newsroom URL has moved, find the new one and update NEWSROOMS
        in scripts/gnews.py in a separate PR, not this one.
      - LEGISLATION: bills about the program with an action in the window,
        from LegiScan. If it says SKIPPED (no API key), say so in the
        report; don't treat it as "no bills".

   How to read the NEWS list. Read every distinct story in each state's
   group, not just the ones whose headlines look promising: a governor's
   quote is often deep inside a story with a generic headline ("Feds
   release guidance..."). The only items you may skip without opening are
   op-eds and opinion columns, advocacy groups' own posts and press
   releases, and items plainly about something else (e.g. "Washington"
   meaning D.C., another state's program, an unrelated "voucher" such as
   housing). In the NATIONAL group, also open every news story (not
   opinion), since national pieces often quote several governors' offices.
   Get real article addresses with
     python scripts/gnews.py resolve <numbers>
   (e.g. resolve 4 16 22; 4:2 is the second copy of item 4, useful when
   the first copy is paywalled). Google News links are redirects and web
   searches often can't find the article, so always use resolve. If
   resolve fails for an item, search the outlet's own site for the title.
   While reading:
   - When an article links to a state politics outlet or newsletter about
     the governor's response (e.g. Capitol Fax for Illinois), open that too.
     Those often carry the governor's statement and rarely reach Google News.
   - When an article says the reporter "asked the governor's office for
     comment and will update", reopen it at the end of the run: the
     statement may have been added. (A statement added after publication
     follows the dating rule in step 6.)
   - Before closing a state, check whether any other story you read today
     dates the same statement ("said Thursday"): that confirms a date
     another article left open.
   Negative news counts as much as positive: a governor criticising the
   program, refusing, or stalling is a development to record.
   The dates in the list are when Google News picked an item up, not when
   it was published. Outlets repost old stories, so a months-old article
   can show up as this week's. Always take the date from the article page
   itself (its byline date or published date). If that date is older than
   7 days, still record the development if it isn't in the file yet,
   but use the article's own date.
   If an article is paywalled or blocked, retry with a browser user-agent;
   if you still can't read it, don't guess what it says. Put it in
   "Needs your call" with its headline and link.
   If the script fails or a group prints FEED FAILED, fall back to ONE web
   search with the same terms plus the current month and year (e.g.
   "... October 2026"), ignore results older than 7 days, and say in the
   report that you used the fallback.

   In the report, say how many distinct stories you opened per state and
   list any you could not read (paywall, blocked), so it's clear what was
   and wasn't covered.

   Compare all of this to the file:
   - Is any state on the IRS list that isn't "opted-in" in the file, or the
     other way around?
   - Does any source describe a development (a state and date) not yet in
     that state's updates?
   If nothing is new, and today isn't a Monday, STOP: report "No changes"
   (with the coverage counts above) and end the run.
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
   - Dating statements: when a governor's office or spokesperson is quoted
     in an article ("said X, the governor's spokesperson") with no other
     timing, they said it for that article, so use the article's
     publication date. Use a stated date when the article gives one
     ("said Tuesday", "told reporters on Sept. 12"). Don't guess when the
     article suggests it was said at another time, e.g. "has said",
     "previously said", "added after publication", or a quote that
     refers to events already past. Then propose the update in "Needs
     your call" with the article's date and say the event date is
     unconfirmed.
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

8. If nothing changed, no links are broken and nothing needs a decision,
   stop. No branch, no PR, no email. Report "No changes."
   If no data changed and no links are broken, but there are "Needs your
   call" items, don't create a branch or PR. Skip to step 10 and send the
   "decisions only" email.
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

10. Email mel@scholarstreet.org from my Gmail:
   - If you opened or updated a pull request this run: subject
     "State table updates ready for review (YYYY-MM-DD)". Body: the same
     summary as your report, the PR link and the preview link to
     news.html, and the "Needs your call" items.
   - If there was no PR but there are "Needs your call" items (step 8):
     subject "State table: decisions needed (YYYY-MM-DD)". Body: each item
     with the state, what was found, the article link, and the question
     to decide (e.g. "Add this update dated X?", "Move to warm?").
   Send nothing on "No changes" runs.

REPORT
End each run with a short summary: what changed (including any status
changes and why), the PR link and preview link (if any), what needs a
decision, whether an email was sent, and whether any source failed or a
fallback was used.
