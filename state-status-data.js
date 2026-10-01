/* State status for the homepage state status table.
   Static data, hand-researched (sources and rules in the comment above
   KNOWN), meant to be swapped for a maintained source later. The table
   only reads window.SS_STATES, so a replacement just has to produce the
   same shape:

     code      two-letter postal code
     name      state name as displayed
     status    'opted-in' | 'pending-warm' | 'pending-cold' |
               'not-participating' | null (not yet verified)
     verified  true once the state's status has been researched
     optInDate        'YYYY-MM-DD' of the formal opt-in, or null if undated
     optInGovernor    governor who made the opt-in, or null
     optInVia         who opted in instead, when a legislature overrode a veto
     currentGovernor  sitting governor, or null
     irsListed        'YYYY-MM-DD' IRS list edition the state first appears in
     irsListedBy      true when that is the earliest archived edition, so the
                      state may have been listed sooner
     credit    { name, detail, url } for a state tax-credit scholarship, or
               null (null means none was found, not that none exists); url
               is optional and may be a page on this site
     updates   [{ date: 'YYYY-MM-DD', text, url }], newest first; url is
               optional (left out when there is no working source) */
(function () {
  var NAMES = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
    CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
    HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
    KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
    MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
    NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
    OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
    SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
    VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'
  };

  /* Researched 2026-09-28; re-verified 2026-09-29 (IRS list unchanged at
     Sept. 14; updates added from news since Ballotpedia's June timeline). Sources:
     - IRS, "Federal Scholarship Tax Credit (FSTC)" participating-states page, as of
       Sept. 14, 2026 (30 states), and its Wayback Machine editions as of Mar. 17,
       Jun. 22, Jul. 6 and Jul. 24, 2026 for when each state first appears.
     - Virginia Governor's release, Jan. 9, 2026 ("On January 1, 2026, Virginia
       formally elected to participate").
     - Ballotpedia, "State participation in the federal K-12 education tax credit
       program," as of Sept. 15, 2026: every other dated event, veto and override.
     - eftccredit.com state tracker (Aug. 20, 2026): Minnesota's Mar. 24 date only.
     - 2026-09-29 additions from Ballotpedia News (RI H 7163, VT H.933), Education
       Week (Mar. 4 HI/NM/OR reconsidering), CT Mirror, WNEM, Broad + Liberty,
       City & State (NY, Sept. 16), Jewish Insider (NJ, May 12).
     - Wikipedia, "List of current United States governors."
     Each update's url is the source Ballotpedia cites for that event (the
     Virginia release's own URL is dead, so a news report of it stands in).
     Updates with no cited source have no url.
     - EdChoice, tax-credit scholarship program list: the credit column. States
       it does not list show a dash, not "None" -- absence is not confirmed.
       Each credit's url is the state agency's page for the program, checked
       to load on 2026-09-28; AR, IA, NV and OK have no working official page,
       so they link EdChoice's page instead. Virginia links our own
       va-eistc.html. NV, PA and SD credits are for business donors only,
       per those states' pages.

     Status rules. opted-in: on the IRS list. pending-warm: the governor has said
     publicly they will opt in (New York). pending-cold: undecided, no public
     commitment either way. not-participating: the governor declined, or vetoed
     opt-in legislation that was not overridden. Warm/cold is Scholar Street's
     call to make; change it here.

     optInDate is set only where a source ties a formal action to a date (an
     executive order, Form 15714, a formal announcement, a veto override).
     Statements of intent are updates, not opt-in dates. optInVia replaces
     optInGovernor where a legislature opted the state in over a veto.
     irsListed is the IRS list edition a state first appears in; irsListedBy
     means it was already on the earliest archived edition (Mar. 17, 2026). */
  var KNOWN = {
    "AK": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Mike Dunleavy",
      "optInGovernor": "Mike Dunleavy",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        }
      ]
    },
    "AL": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Kay Ivey",
      "optInDate": "2026-01-16",
      "optInGovernor": "Kay Ivey",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "credit": {
        "name": "Alabama Education Scholarship Program",
        "detail": "State tax-credit scholarship program",
        "url": "https://www.revenue.alabama.gov/individual-corporate/alabama-accountability-act/"
      },
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2026-01-16",
          "text": "Gov. Ivey signs Executive Order 742 opting Alabama in.",
          "url": "https://governor.alabama.gov/newsroom/2026/01/executive-order-742/"
        }
      ]
    },
    "AR": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Sarah Huckabee Sanders",
      "optInGovernor": "Sarah Huckabee Sanders",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "credit": {
        "name": "Philanthropic Investment in Arkansas Kids",
        "detail": "State tax-credit scholarship program",
        "url": "https://www.edchoice.org/school-choice/programs/philanthropic-investment-in-arkansas-kids-scholarship-program/"
      },
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2026-01-16",
          "text": "Gov. Sanders says Arkansas will participate.",
          "url": "https://governor.arkansas.gov/news_post/arkansas-to-participate-in-president-trumps-federal-tax-credit-scholarship-program-for-school-choice/"
        }
      ]
    },
    "AZ": {
      "status": "not-participating",
      "verified": true,
      "currentGovernor": "Katie Hobbs",
      "credit": {
        "name": "Four programs",
        "detail": "Including the Original Individual Income Tax Credit Scholarship",
        "url": "https://azdor.gov/tax-credits/credits-contributions-certified-school-tuition-organizations"
      },
      "updates": [
        {
          "date": "2026-05-05",
          "text": "Gov. Hobbs vetoes a third opt-in bill.",
          "url": "https://apps.azleg.gov/BillStatus/BillOverview/85722"
        },
        {
          "date": "2026-04-13",
          "text": "Gov. Hobbs vetoes SB 1142, a second opt-in bill."
        },
        {
          "date": "2026-01-16",
          "text": "Gov. Hobbs vetoes SB 1106, a budget bill that included opting in.",
          "url": "https://azmirror.com/2026/01/16/hobbs-vetoes-republican-tax-bill-deepening-a-political-battle-over-conformity-with-trumps-tax-cuts/"
        }
      ]
    },
    "CA": {
      "status": "pending-cold",
      "verified": true,
      "currentGovernor": "Gavin Newsom",
      "updates": []
    },
    "CO": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Jared Polis",
      "optInGovernor": "Jared Polis",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2025-12-05",
          "text": "Gov. Polis says Colorado will opt in.",
          "url": "https://coloradosun.com/2025/12/05/colorado-federal-tax-credit-scholarship-program-voucher/"
        }
      ]
    },
    "CT": {
      "status": "pending-cold",
      "verified": true,
      "currentGovernor": "Ned Lamont",
      "updates": [
        {
          "date": "2026-05-20",
          "text": "Gov. Lamont calls opting in premature until more federal guidance is out.",
          "url": "https://ctmirror.org/2026/05/20/lamont-ct-federal-scholarship-tax-credit-ny-hochul/"
        }
      ]
    },
    "DE": {
      "status": "pending-cold",
      "verified": true,
      "currentGovernor": "Matt Meyer",
      "updates": []
    },
    "FL": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Ron DeSantis",
      "optInGovernor": "Ron DeSantis",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2026-01-28",
          "text": "Gov. DeSantis announces Florida will participate.",
          "url": "https://www.flgov.com/eog/news/press/2026/governor-ron-desantis-announces-florida-opts-federal-education-freedom-tax-credit"
        }
      ]
    },
    "GA": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Brian Kemp",
      "optInDate": "2026-01-20",
      "optInGovernor": "Brian Kemp",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "credit": {
        "name": "Qualified Education Expense Tax Credit",
        "detail": "State tax-credit scholarship program",
        "url": "https://dor.georgia.gov/qualified-education-expense-tax-credit-0"
      },
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2026-01-20",
          "text": "Gov. Kemp formally opts Georgia in.",
          "url": "https://www.cbsnews.com/atlanta/news/gov-kemp-signs-georgia-into-federal-scholarship-tax-credit-program-for-k-12-families/"
        }
      ]
    },
    "HI": {
      "status": "not-participating",
      "verified": true,
      "currentGovernor": "Josh Green",
      "updates": [
        {
          "date": "2026-03-04",
          "text": "Gov. Green’s office says it is reviewing the program again.",
          "url": "https://www.edweek.org/policy-politics/they-said-no-to-the-federal-school-choice-program-now-3-dems-are-reconsidering/2026/03"
        }
      ]
    },
    "IA": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Kim Reynolds",
      "optInGovernor": "Kim Reynolds",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "credit": {
        "name": "School Tuition Organization Tax Credit",
        "detail": "State tax-credit scholarship program",
        "url": "https://www.edchoice.org/school-choice/programs/iowa-school-tuition-organization-tax-credit/"
      },
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2026-01-05",
          "text": "Gov. Reynolds announces she intends to opt Iowa in.",
          "url": "https://governor.iowa.gov/press-release/2026-01-05/gov-reynolds-opts-federal-education-tax-credit-program-expands-school-choice-iowa-families"
        }
      ]
    },
    "ID": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Brad Little",
      "optInDate": "2026-01-16",
      "optInGovernor": "Brad Little",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "updates": [
        {
          "date": "2026-03-19",
          "text": "HB 731 enacted, requiring Idaho to opt in every year."
        },
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2026-01-16",
          "text": "Gov. Little submits IRS Form 15714 electing to participate.",
          "url": "https://www.idahoednews.org/legislature/idaho-will-participate-in-federal-education-tax-credit-governor-says/"
        }
      ]
    },
    "IL": {
      "status": "pending-cold",
      "verified": true,
      "currentGovernor": "JB Pritzker",
      "updates": []
    },
    "IN": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Mike Braun",
      "optInGovernor": "Mike Braun",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "credit": {
        "name": "School Scholarship Tax Credit",
        "detail": "State tax-credit scholarship program",
        "url": "https://www.in.gov/doe/students/indiana-choice-scholarship-program/school-scholarships/"
      },
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2026-03-12",
          "text": "HB 1266 enacted, requiring Indiana to opt in."
        },
        {
          "date": "2026-01-22",
          "text": "Gov. Braun announces Indiana will participate.",
          "url": "https://events.in.gov/event/gov-braun-opts-in-to-new-federal-tax-credit-for-school-choice-scholarships"
        }
      ]
    },
    "KS": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Laura Kelly",
      "optInDate": "2026-04-09",
      "optInVia": "Legislature, over Gov. Kelly’s veto",
      "irsListed": "2026-07-06",
      "credit": {
        "name": "Tax Credit for Low-Income Students",
        "detail": "State tax-credit scholarship program",
        "url": "https://www.ksde.gov/student-success/access-and-opportunity-in-education/tax-credit-for-low-income-students-scholarship-program"
      },
      "updates": [
        {
          "date": "2026-07-06",
          "text": "Added to the IRS list of participating states.",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2026-04-09",
          "text": "Legislature overrides Gov. Kelly’s veto of SB 361, opting Kansas in every year.",
          "url": "https://www.kslegislature.gov/li/b2025_26/measures/sb361/"
        },
        {
          "date": "2026-04-06",
          "text": "Gov. Kelly vetoes HB 2468, an opt-in bill.",
          "url": "https://kslegislature.gov/li/b2025_26/measures/hb2468/"
        }
      ]
    },
    "KY": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Andy Beshear",
      "optInDate": "2026-03-17",
      "optInVia": "Legislature, over Gov. Beshear’s veto",
      "irsListed": "2026-07-24",
      "updates": [
        {
          "date": "2026-07-24",
          "text": "Added to the IRS list of participating states.",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2026-03-17",
          "text": "Legislature overrides Gov. Beshear’s veto of HB 1, opting Kentucky in every year.",
          "url": "https://apps.legislature.ky.gov/record/26rs/hb1.html"
        }
      ]
    },
    "LA": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Jeff Landry",
      "optInGovernor": "Jeff Landry",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "credit": {
        "name": "Tuition Donation Credit Program",
        "detail": "State tax-credit scholarship program",
        "url": "https://revenue.louisiana.gov/tax-education-and-faqs/faqs/tuition-donation-credit-program"
      },
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2025-12-17",
          "text": "Gov. Landry says Louisiana will participate.",
          "url": "https://www.facebook.com/GovJeffLandry/photos/earlier-this-year-president-donald-j-trumps-one-big-beautiful-bill-created-a-new/122254504466179824/"
        }
      ]
    },
    "MA": {
      "status": "pending-cold",
      "verified": true,
      "currentGovernor": "Maura Healey",
      "updates": []
    },
    "MD": {
      "status": "pending-cold",
      "verified": true,
      "currentGovernor": "Wes Moore",
      "updates": []
    },
    "ME": {
      "status": "pending-cold",
      "verified": true,
      "currentGovernor": "Janet Mills",
      "updates": []
    },
    "MI": {
      "status": "pending-cold",
      "verified": true,
      "currentGovernor": "Gretchen Whitmer",
      "updates": [
        {
          "date": "2026-03-30",
          "text": "House Speaker Matt Hall urges Gov. Whitmer to opt in; her office says it is waiting for Treasury guidance.",
          "url": "https://www.wnem.com/2026/03/30/speaker-hall-urges-whitmer-join-federal-education-tax-credit-program/"
        }
      ]
    },
    "MN": {
      "status": "not-participating",
      "verified": true,
      "currentGovernor": "Tim Walz",
      "updates": [
        {
          "date": "2026-03-24",
          "text": "Gov. Walz says Minnesota will not participate."
        }
      ]
    },
    "MO": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Mike Kehoe",
      "optInGovernor": "Mike Kehoe",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        }
      ]
    },
    "MS": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Tate Reeves",
      "optInDate": "2026-01-19",
      "optInGovernor": "Tate Reeves",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2026-01-19",
          "text": "Gov. Reeves formally opts Mississippi in.",
          "url": "https://governorreeves.ms.gov/governor-reeves-opts-into-federal-tax-credit-scholarship-program-to-promote-school-choice/"
        }
      ]
    },
    "MT": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Greg Gianforte",
      "optInDate": "2026-01-21",
      "optInGovernor": "Greg Gianforte",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "credit": {
        "name": "Student Scholarship Organization credits",
        "detail": "State tax-credit scholarship program",
        "url": "https://revenue.mt.gov/taxes/tax-credits/student-scholarship-org-credit"
      },
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2026-01-21",
          "text": "Gov. Gianforte formally opts Montana in.",
          "url": "https://news.mt.gov/Governors-Office/Montana-Opts-in-to-Federal-Tax-Credit-Scholarship-Program-Expanding-Education-Freedom"
        }
      ]
    },
    "NC": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Josh Stein",
      "optInDate": "2026-06-03",
      "optInVia": "Legislature, over Gov. Stein’s veto",
      "irsListed": "2026-06-22",
      "updates": [
        {
          "date": "2026-06-22",
          "text": "Added to the IRS list of participating states.",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2026-06-03",
          "text": "Legislature overrides Gov. Stein’s veto of HB 87, opting North Carolina in every year.",
          "url": "https://www.theassemblync.com/education/k-12-education/stein-vetoes-bill-opting-into-federal-school-vouchers/"
        },
        {
          "date": "2025-08-06",
          "text": "Gov. Stein vetoes HB 87, saying he would opt in after Treasury guidance.",
          "url": "https://governor.nc.gov/news/press-releases/2025/08/06/governor-stein-takes-action-three-bills"
        }
      ]
    },
    "ND": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Kelly Armstrong",
      "optInGovernor": "Kelly Armstrong",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2026-01-26",
          "text": "Gov. Armstrong announces North Dakota will participate.",
          "url": "https://www.governor.nd.gov/news/armstrong-nd-participate-federal-tax-credit-donations-scholarship-granting-organizations"
        }
      ]
    },
    "NE": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Jim Pillen",
      "optInGovernor": "Jim Pillen",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2025-09-29",
          "text": "Gov. Pillen orders state agencies to prepare to participate.",
          "url": "https://governor.nebraska.gov/surrounded-students-gov-pillen-signs-order-opting-federal-scholarship-tax-credit"
        }
      ]
    },
    "NH": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Kelly Ayotte",
      "optInDate": "2026-01-29",
      "optInGovernor": "Kelly Ayotte",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "updates": [
        {
          "date": "2026-07-02",
          "text": "HB 1774 enacted, requiring New Hampshire to opt in."
        },
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2026-01-29",
          "text": "Gov. Ayotte opts New Hampshire in."
        }
      ]
    },
    "NJ": {
      "status": "pending-cold",
      "verified": true,
      "currentGovernor": "Mikie Sherrill",
      "updates": [
        {
          "date": "2026-05-12",
          "text": "Gov. Sherrill’s office says she will evaluate the program once federal rules are final.",
          "url": "https://jewishinsider.com/2026/05/mikie-sherrill-education-tax-initiative-not-committed-kathy-hochul/"
        }
      ]
    },
    "NM": {
      "status": "not-participating",
      "verified": true,
      "currentGovernor": "Michelle Lujan Grisham",
      "updates": [
        {
          "date": "2026-03-04",
          "text": "Gov. Lujan Grisham’s office says she is seeking more federal guidance before a final decision.",
          "url": "https://www.edweek.org/policy-politics/they-said-no-to-the-federal-school-choice-program-now-3-dems-are-reconsidering/2026/03"
        },
        {
          "date": "2025-08-13",
          "text": "Gov. Lujan Grisham says New Mexico will not opt in.",
          "url": "https://www.chalkbeat.org/2025/08/13/federal-tax-credit-scholarship-divides-democratic-governors/"
        }
      ]
    },
    "NV": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Joe Lombardo",
      "optInGovernor": "Joe Lombardo",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "credit": {
        "name": "Nevada Educational Choice Scholarship",
        "detail": "Business donors only, against the Modified Business Tax",
        "url": "https://www.edchoice.org/school-choice/programs/nevada-educational-choice-scholarship-program/"
      },
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        }
      ]
    },
    "NY": {
      "status": "pending-warm",
      "verified": true,
      "currentGovernor": "Kathy Hochul",
      "updates": [
        {
          "date": "2026-09-16",
          "text": "As teachers’ unions urge her to opt out, Gov. Hochul’s office reiterates her support, pending final federal rules.",
          "url": "https://www.cityandstateny.com/policy/2026/09/hochul-weighs-opting-tax-credit-teachers-unions-and-school-choice-advocates-vie-her-ear/416038/"
        },
        {
          "date": "2026-05-07",
          "text": "Gov. Hochul says New York plans to opt in once IRS regulations are out.",
          "url": "https://www.chalkbeat.org/newyork/2026/05/08/kathy-hochul-opts-into-federal-tax-scholarship-school-choice/"
        }
      ]
    },
    "OH": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Mike DeWine",
      "optInGovernor": "Mike DeWine",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "credit": {
        "name": "Ohio Tax-Credit Scholarship Program",
        "detail": "State tax-credit scholarship program",
        "url": "https://tax.ohio.gov/individual/scholarship-donation-credit"
      },
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        }
      ]
    },
    "OK": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Kevin Stitt",
      "optInGovernor": "Kevin Stitt",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "credit": {
        "name": "Equal Opportunity Education Scholarships",
        "detail": "State tax-credit scholarship program",
        "url": "https://www.edchoice.org/school-choice/programs/oklahoma-equal-opportunity-education-scholarships/"
      },
      "updates": [
        {
          "date": "2026-04-17",
          "text": "HB 3704 enacted, requiring Oklahoma to opt in every year."
        },
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        }
      ]
    },
    "OR": {
      "status": "not-participating",
      "verified": true,
      "currentGovernor": "Tina Kotek",
      "updates": [
        {
          "date": "2026-06-12",
          "text": "Gov. Kotek says Oregon will not participate after reviewing the draft rules."
        },
        {
          "date": "2026-03-04",
          "text": "Gov. Kotek’s office says she has not determined whether to participate.",
          "url": "https://www.edweek.org/policy-politics/they-said-no-to-the-federal-school-choice-program-now-3-dems-are-reconsidering/2026/03"
        },
        {
          "date": "2025-08-13",
          "text": "Gov. Kotek says Oregon will not opt in.",
          "url": "https://www.chalkbeat.org/2025/08/13/federal-tax-credit-scholarship-divides-democratic-governors/"
        }
      ]
    },
    "PA": {
      "status": "pending-cold",
      "verified": true,
      "currentGovernor": "Josh Shapiro",
      "credit": {
        "name": "EITC and OSTC",
        "detail": "Educational Improvement and Opportunity Scholarship credits · business donors",
        "url": "https://www.pa.gov/agencies/revenue/business-tax-credits-and-economic-development-programs/business-tax-credits-and-incentives/educational-tax-credits"
      },
      "updates": [
        {
          "date": "2026-08-18",
          "text": "Gov. Shapiro’s office says he is awaiting federal guidance before deciding.",
          "url": "https://broadandliberty.com/2026/08/18/pennsylvania-still-on-the-fence-about-federal-school-choice-tax-credits/"
        }
      ]
    },
    "RI": {
      "status": "pending-cold",
      "verified": true,
      "currentGovernor": "Dan McKee",
      "credit": {
        "name": "Scholarship Organization tax credits",
        "detail": "State tax-credit scholarship program",
        "url": "https://tax.ri.gov/tax-sections/credits/scholarship-credit"
      },
      "updates": [
        {
          "date": "2026-06-18",
          "text": "Gov. McKee signs H 7163, requiring both the legislature and the governor to approve opting in.",
          "url": "https://news.ballotpedia.org/2026/06/23/gov-mckee-d-signs-bill-to-require-governor-legislature-agreement-before-opting-into-education-freedom-tax-credit/"
        }
      ]
    },
    "SC": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Henry McMaster",
      "optInGovernor": "Henry McMaster",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "credit": {
        "name": "Exceptional Needs Children Fund credit",
        "detail": "State tax-credit scholarship program",
        "url": "https://dor.sc.gov/tax-credits/ecenc-program-credits"
      },
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        }
      ]
    },
    "SD": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Larry Rhoden",
      "optInGovernor": "Larry Rhoden",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "credit": {
        "name": "Partners in Education Tax Credit",
        "detail": "Insurance companies only",
        "url": "https://dlr.sd.gov/insurance/tax_credit_program.aspx"
      },
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2025-11-14",
          "text": "Gov. Rhoden announces South Dakota intends to participate.",
          "url": "https://news.sd.gov/news?id=news_kb_article_view&sys_id=d8db85984799b290a497127ba26d43a7"
        }
      ]
    },
    "TN": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Bill Lee",
      "optInGovernor": "Bill Lee",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "updates": [
        {
          "date": "2026-04-14",
          "text": "SB 2206 enacted, requiring Tennessee to opt in."
        },
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2025-08-04",
          "text": "Gov. Lee’s office says Tennessee plans to opt in.",
          "url": "https://www.edweek.org/policy-politics/opt-in-or-not-states-weigh-big-decision-on-federal-school-vouchers/2025/08"
        }
      ]
    },
    "TX": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Greg Abbott",
      "optInGovernor": "Greg Abbott",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2025-12-10",
          "text": "Gov. Abbott announces he intends to opt Texas in.",
          "url": "https://gov.texas.gov/news/post/governor-abbott-announces-texas-intent-to-opt-in-to-federal-school-choice-tax-credit-program"
        }
      ]
    },
    "UT": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Spencer Cox",
      "optInGovernor": "Spencer Cox",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        }
      ]
    },
    "VA": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Abigail Spanberger",
      "optInDate": "2026-01-01",
      "optInGovernor": "Glenn Youngkin",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "credit": {
        "name": "EISTC",
        "detail": "65% credit · Va. Code § 58.1-439.26",
        "url": "va-eistc.html"
      },
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        },
        {
          "date": "2026-01-09",
          "text": "Gov. Youngkin announces Virginia is the first state to formally opt in, effective January 1.",
          "url": "https://www.potomaclocal.com/2026/01/10/virginia-first-state-to-opt-into-education-freedom-tax-credit-program/"
        }
      ]
    },
    "VT": {
      "status": "pending-cold",
      "verified": true,
      "currentGovernor": "Phil Scott",
      "updates": [
        {
          "date": "2026-06-18",
          "text": "Gov. Scott signs H.933, limiting how scholarships under the federal credit can be used.",
          "url": "https://news.ballotpedia.org/2026/07/06/vermont-enacts-bill-to-limit-how-scholarships-under-education-freedom-tax-credit-can-be-used/"
        }
      ]
    },
    "WA": {
      "status": "pending-cold",
      "verified": true,
      "currentGovernor": "Bob Ferguson",
      "updates": []
    },
    "WI": {
      "status": "not-participating",
      "verified": true,
      "currentGovernor": "Tony Evers",
      "updates": [
        {
          "date": "2026-03-30",
          "text": "Gov. Evers vetoes AB 602, an opt-in bill.",
          "url": "https://docs.legis.wisconsin.gov/2025/proposals/ab602"
        },
        {
          "date": "2025-09-09",
          "text": "Gov. Evers says he will not opt Wisconsin in.",
          "url": "https://www.jsonline.com/story/news/politics/2025/09/09/tony-evers-says-he-wont-sign-on-to-federal-school-choice-tax-credits/85997868007/"
        }
      ]
    },
    "WV": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Patrick Morrisey",
      "optInGovernor": "Patrick Morrisey",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        }
      ]
    },
    "WY": {
      "status": "opted-in",
      "verified": true,
      "currentGovernor": "Mark Gordon",
      "optInGovernor": "Mark Gordon",
      "irsListed": "2026-03-17",
      "irsListedBy": true,
      "updates": [
        {
          "date": "2026-03-17",
          "text": "On the IRS list of participating states (earliest archived edition).",
          "url": "https://www.irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc"
        }
      ]
    }
  };

  window.SS_STATES = Object.keys(NAMES).map(function (code) {
    var known = KNOWN[code];
    return {
      code: code,
      name: NAMES[code],
      status: known ? known.status : null,
      verified: known ? known.verified : false,
      optInDate: known ? known.optInDate || null : null,
      optInGovernor: known ? known.optInGovernor || null : null,
      optInVia: known ? known.optInVia || null : null,
      currentGovernor: known ? known.currentGovernor : null,
      irsListed: known ? known.irsListed || null : null,
      irsListedBy: known ? !!known.irsListedBy : false,
      credit: known ? known.credit || null : null,
      updates: known ? known.updates || [] : []
    };
  });

  /* Shown above the table as "Updated <date>". Set it to the day the data
     was last reviewed and changed -- every update PR sets it to its run
     date, so it goes live when that PR is merged. Don't bump it on a run
     that changed nothing. */
  window.SS_UPDATED = '2026-09-29';

  /* Official governor's office website for each current governor, keyed by
     name as it appears above. From USA.gov's state pages (usa.gov/states/<state>),
     checked 2026-09-28 to load; where a site redirected, the final address is
     used. Virginia's is the "About the Governor" page. Several of these sites
     block scripts (403) but open normally in a browser. A name missing here
     just shows unlinked -- add one when a governor changes. */
  window.SS_GOVERNOR_LINKS = {
    "Abigail Spanberger": "https://www.governor.virginia.gov/about-the-governor/",
    "Andy Beshear": "https://governor.ky.gov/",
    "Bill Lee": "https://www.tn.gov/governor.html",
    "Bob Ferguson": "https://governor.wa.gov/",
    "Brad Little": "https://gov.idaho.gov/",
    "Brian Kemp": "https://gov.georgia.gov/",
    "Dan McKee": "https://governor.ri.gov/",
    "Gavin Newsom": "https://www.gov.ca.gov/",
    "Greg Abbott": "https://gov.texas.gov/",
    "Greg Gianforte": "https://governor.mt.gov/",
    "Gretchen Whitmer": "https://www.michigan.gov/whitmer",
    "Henry McMaster": "https://governor.sc.gov/",
    "JB Pritzker": "https://gov.illinois.gov/",
    "Janet Mills": "https://www.maine.gov/governor/mills/",
    "Jared Polis": "https://www.colorado.gov/governor/",
    "Jeff Landry": "https://gov.louisiana.gov/",
    "Jim Pillen": "https://governor.nebraska.gov/",
    "Joe Lombardo": "https://www.gov.nv.gov/",
    "Josh Green": "https://governor.hawaii.gov/",
    "Josh Shapiro": "https://www.pa.gov/governor",
    "Josh Stein": "https://governor.nc.gov/",
    "Kathy Hochul": "https://www.governor.ny.gov/",
    "Katie Hobbs": "https://azgovernor.gov/governor/meet-governor-katie-hobbs",
    "Kay Ivey": "https://governor.alabama.gov/",
    "Kelly Armstrong": "https://www.governor.nd.gov/",
    "Kelly Ayotte": "https://www.governor.nh.gov/",
    "Kevin Stitt": "https://oklahoma.gov/governor.html",
    "Kim Reynolds": "https://governor.iowa.gov/",
    "Larry Rhoden": "https://governor.sd.gov/",
    "Laura Kelly": "https://www.governor.ks.gov/",
    "Mark Gordon": "https://governor.wyo.gov/",
    "Matt Meyer": "https://governor.delaware.gov/",
    "Maura Healey": "https://www.mass.gov/orgs/governor-maura-healey-and-lt-governor-kim-driscoll",
    "Michelle Lujan Grisham": "https://www.governor.state.nm.us/",
    "Mike Braun": "https://www.in.gov/gov/",
    "Mike DeWine": "https://governor.ohio.gov/home",
    "Mike Dunleavy": "https://gov.alaska.gov/",
    "Mike Kehoe": "https://governor.mo.gov/",
    "Mikie Sherrill": "https://www.nj.gov/governor/",
    "Ned Lamont": "https://portal.ct.gov/governor",
    "Patrick Morrisey": "https://governor.wv.gov/",
    "Phil Scott": "https://governor.vermont.gov/",
    "Ron DeSantis": "https://www.flgov.com/eog/",
    "Sarah Huckabee Sanders": "https://governor.arkansas.gov/",
    "Spencer Cox": "https://governor.utah.gov/",
    "Tate Reeves": "https://governorreeves.ms.gov/",
    "Tim Walz": "https://mn.gov/governor/",
    "Tina Kotek": "https://www.oregon.gov/gov/Pages/index.aspx",
    "Tony Evers": "https://evers.wi.gov/pages/home.aspx",
    "Wes Moore": "https://governor.maryland.gov/leadership/governor-wes-moore"
  };
})();
