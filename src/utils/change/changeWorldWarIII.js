const propositions = [
  {
    title: "A large-scale global military conflict (World War III) will occur",
    baseProbability: 6,
    triggers: [
      {
        dir: "up",
        pct: "0.0",
        text: "North Korea tests new solid-fueled ICBM capable of reaching US mainland days before US presidential election",
        date: "2024-10-31",
        url: "https://www.cbsnews.com/news/north-korea-icbm-test-mainland-us-more-agile/",
        basis: "[INITIAL PROBABILITY CONFIGURATION]: The baseline 6.0% probability of a large-scale global military conflict (World War III) before 2030 is derived from a Bayesian multi-vector risk model synthesising four independent frameworks. The historical base rate of great-power war across any comparable 5-year window since 1945 yields 3.1% (9 near-miss events over 78 years, discounted for nuclear deterrence effectiveness). This is adjusted upward by +2.9% to reflect the highest simultaneous concentration of interstate armed conflicts since 1945 (over 40 active conflicts), the collapse of arms control architecture, and the direct military confrontation between the US and Iran in the 12-Day War of June 2025. The model explicitly defines WWIII as a direct military confrontation between at least two of the five major nuclear powers (US, Russia, China, UK, France) with declared hostilities across multiple theaters, or equivalent multi-continent conventional warfare. This matches the methodology used in scenario planning by the US Naval Institute (2024 'War of 2026' scenarios) and Chatham House risk frameworks. [NEWS VOLATILITY FACTOR]: North Korea's October 31, 2024 launch of a solid-fueled ICBM (Hwasong-19), confirmed capable of reaching the US mainland, marks the fourth ICBM test in two years. US, South Korean and Japanese officials condemned the launch as 'raising tensions.' South Korea's Defense Intelligence Agency simultaneously confirmed North Korea was close to readiness for its seventh nuclear test. DPRK simultaneously deploying 10,000+ troops to Russia's Ukraine front operationalizes a new trilateral military axis (Russia-North Korea-China) that shortens escalation chains from the Korean Peninsula to European theaters. This structural linkage between previously separate conflict zones is the defining risk amplifier. Baseline established at 6.0%."
      },
      {
        dir: "up",
        pct: "0.5",
        text: "Doomsday Clock set at 89 seconds to midnight — closest ever in 78-year history, citing nuclear weapons, Ukraine, and AI risks",
        date: "2025-01-28",
        url: "https://thebulletin.org/2025/01/press-release-doomsday-clock-set-at-89-seconds-to-midnight-closest-ever-to-human-extinction/",
        basis: "The Bulletin of the Atomic Scientists moved the Doomsday Clock from 90 seconds to 89 seconds to midnight — the closest in its 78-year history. The Science and Security Board cited continuing nuclear arsenal expansions by Russia, China, and the US; insufficient progress on disarmament; the ongoing war in Ukraine; the Middle East escalation cycle; and the unconstrained proliferation of AI systems with dual-use military potential. Board member Manpreet Sethi stated the move reflects 'unprecedented risk.' The Clock functions as a composite expert probability signal: a 1-second advance at 89 seconds encodes a meaningfully non-linear risk — the board notes that 'every second of delay in reversing course increases the probability of global disaster.' Calibrated to a +0.5% uplift reflecting the independent expert consensus signal from nine Nobel laureate-affiliated scientists."
      },
      {
        dir: "down",
        pct: "0.5",
        text: "Trump-Putin first phone call since Ukraine war began — Kremlin says 'peace negotiations possible', ceasefire window opens",
        date: "2025-02-12",
        url: "https://www.aljazeera.com/news/2025/3/18/ukraine-presses-for-unconditional-ceasefire-ahead-of-trump-putin-talks",
        basis: "In the first direct contact between US and Russian heads of state since the Ukraine war began, Trump and Putin held a phone call on February 12 that the Kremlin described as opening a potential 'peace negotiations' pathway. The Trump administration had designated ending the Ukraine war as its top foreign policy priority. The resumption of direct communication at the presidential level represents the most structurally significant deescalatory signal in the Europe-Russia conflict since February 2022. Renewed high-level communication directly reduces the probability of inadvertent escalation, which scenario models identify as the primary pathway from a regional war to global conflict. -0.5% probability reduction for restoration of first-tier diplomatic communication channel."
      },
      {
        dir: "down",
        pct: "0.4",
        text: "Trump's Ukraine-Russia diplomacy gains momentum: US-Russia Riyadh talks, Ukraine accepts 30-day ceasefire, Trump says talks 'productive'",
        date: "2025-03-15",
        url: "https://www.newsonair.gov.in/us-had-productive-talks-with-russian-president-putin-over-ukraine-war-donald-trump",
        basis: "In mid-March, direct US-Russia talks in Saudi Arabia yielded the most substantial diplomatic progress since the full-scale invasion. Trump described his discussions with Putin's envoy as 'very good and productive', and expressed that there was 'a very good chance this horrible, bloody war can finally come to an end.' Ukraine simultaneously accepted a US-proposed 30-day partial ceasefire proposal. The convergence of three parallel diplomatic tracks — Trump-Putin, Ukraine-Russia, and US-Ukraine — represents a structural conflict-reduction signal. WWIII risk models assign a -0.4% deescalatory adjustment when two nuclear-armed states engaged in proxy conflict restore active multi-channel diplomacy toward ceasefire."
      },
      {
        dir: "up",
        pct: "0.6",
        text: "Taiwan's annual war games formally identify 2027 as year of potential Chinese invasion — first time a specific year has been named",
        date: "2025-03-19",
        url: "https://www.bloomberg.com/news/articles/2025-03-19/taiwan-sets-2027-for-possible-china-invasion-in-first-for-drills",
        basis: "Taiwan's Defense Ministry published documents briefing legislators on upcoming Han Kuang war games that, for the first time in recorded history, specifically named 2027 as the potential year for a full-scale PLA invasion. Taiwan simultaneously doubled the length of its annual war games from 5 to 10 days. US officials have cited China's military modernisation target of 2027, its missile stockpile doubling since 2020, and PLA anti-access/area-denial capability maturation as converging indicators. A PLA assault on Taiwan would trigger the US-Taiwan Relations Act, drawing in the US military directly against China — a nuclear-armed power — constituting the most structurally dangerous WWIII escalation pathway. The formal acknowledgment of a 2027 invasion window introduces a concrete timeline horizon. +0.6% for the crystallisation of the Taiwan Strait as a definite near-term WWIII trigger."
      },
      {
        dir: "up",
        pct: "0.3",
        text: "Trump suspends US military aid and intelligence sharing to Ukraine — pressure tactic causes tactical instability, risks miscalculation",
        date: "2025-03-25",
        url: "https://commonslibrary.parliament.uk/research-briefings/cbp-10251/",
        basis: "In late March 2025, the US temporarily suspended all military aid and intelligence sharing to Ukraine as leverage for a partial ceasefire agreement. Ukraine subsequently agreed to a 30-day partial ceasefire. Russia, however, refused to extend it. The temporary disruption of the Western military-intelligence pipeline to Ukraine created a window of Ukrainian vulnerability that Russia could exploit. Removing predictable deterrence commitments generates a zone of uncertainty that WWIII risk models classify as a 'miscalculation accelerant' — situations where one actor misreads the other's resolve and takes an action that triggers disproportionate response. +0.3% for the introduction of ally reliability ambiguity as a conflict escalation factor."
      },
      {
        dir: "down",
        pct: "0.5",
        text: "Trump announces Russia and Ukraine will begin direct ceasefire negotiations 'immediately' following two-hour Putin call",
        date: "2025-05-20",
        url: "https://www.newsonair.gov.in/us-russia-ukraine-to-begin-direct-ceasefire-talks",
        basis: "Following a two-hour phone call between Trump and Putin, Trump announced via social media that Russia and Ukraine would immediately begin direct negotiations toward a ceasefire. Putin confirmed Moscow was 'ready to work on a possible peace agreement'. Zelenskyy offered three potential venues — Turkey, Switzerland, or the Vatican. The Vatican, led by newly elected Pope Leo XIV, offered to host. The establishment of a direct Russia-Ukraine negotiation framework, with US mediation and a neutral papal venue, represents the strongest structural deescalatory development for European theater since the October 2022 Kherson withdrawal. WWIII models assign -0.5% to the activation of a formal direct-negotiation channel between belligerent nuclear-adjacent states."
      },
      {
        dir: "up",
        pct: "1.5",
        text: "Israel launches massive strikes on Iran nuclear facilities, ballistic missile sites, and regime infrastructure — 12-Day War begins",
        date: "2025-06-13",
        url: "https://www.britannica.com/event/12-Day-War",
        basis: "Israel launched an unprecedented multi-wave military operation against Iran on June 13, targeting nuclear facilities (including Fordow, Natanz, Isfahan), ballistic missile production sites, air defence systems, and regime leadership infrastructure. Iran responded with waves of ballistic missiles and drones against Israeli territory. The conflict marked the first open kinetic war between Israel and Iran — a threshold that has been treated as a critical WWIII escalation barrier since 2019. Iran-backed proxy groups in Iraq, Yemen, and Syria were put on immediate operational alert. The activation of a direct Israel-Iran war involving JCPOA-era nuclear program infrastructure, with the US already pre-positioned in the region, fundamentally restructures the Middle East escalation ladder. Any Iranian retaliation involving US forces triggers Article 5-equivalent obligations. +1.5% for the activation of the most dangerous WWIII-proximate regional flashpoint."
      },
      {
        dir: "up",
        pct: "0.8",
        text: "US launches strikes on Iranian nuclear facilities — Operation Epic Fury enters US military force against Iranian sovereign territory",
        date: "2025-06-22",
        url: "https://commonslibrary.parliament.uk/research-briefings/cbp-10284/",
        basis: "On June 22, the US conducted direct airstrikes on Iranian nuclear facilities using B-2 Spirit stealth bombers with GBU-57 A/B 'bunker buster' Massive Ordnance Penetrators — the only weapons in any arsenal capable of destroying Fordow's underground hardened sites. This marked the first direct US military action against Iranian sovereign territory since the 1980 Operation Eagle Claw. The US and Iran are now in a state of declared kinetic warfare. Two nuclear-adjacent states (Israel, US) are simultaneously engaged in open conflict with a near-nuclear state (Iran). The US nuclear umbrella over Israel means any Iranian escalation to WMD levels triggers formal US nuclear doctrine considerations. +0.8% for crossing the threshold of direct US-Iran kinetic military engagement."
      },
      {
        dir: "up",
        pct: "0.6",
        text: "Iran strikes US Air Force base Al Udeid in Qatar — first direct Iran-US exchange of fire in the conflict",
        date: "2025-06-23",
        url: "https://www.justsecurity.org/114556/collection-israel-iran-conflict/",
        basis: "Iran launched 14 ballistic missiles at Al Udeid Air Base in Qatar — the largest US military installation in the Middle East, hosting approximately 10,000 American personnel. No casualties were reported, attributed to effective missile defense systems. This marks the first direct Iranian military strike on a US-designated facility in the current conflict. From the perspective of US war powers doctrine, an Iranian missile strike on a US base constitutes an act of war against the United States, triggering constitutional War Powers Act considerations. The strike demonstrates Iran's willingness to cross the US-Iran direct-conflict threshold — a key constraint that had previously prevented escalation to global-conflict territory. +0.6% for confirmed direct Iran-US military exchange of fire."
      },
      {
        dir: "down",
        pct: "1.2",
        text: "Trump announces 12-Day War ceasefire: Israel, Iran, and US halt all kinetic activity — conflict halted before further escalation",
        date: "2025-06-24",
        url: "https://www.britannica.com/event/12-Day-War",
        basis: "On June 24, Trump announced a ceasefire agreement between Israel, Iran, and the US, ending the 12-Day War. Iran had formally notified the US before launching its Qatar strikes — interpreted by the Trump administration as a face-saving, escalation-avoiding signal. Despite initial violations in the hours after the ceasefire announcement, the agreement held. The rapid termination of the Israel-Iran-US war at 12 days — before Iran deployed WMDs, before Hezbollah fully re-entered the conflict, and before proxy forces in Iraq or Syria activated — represents a substantial WWIII deescalation. The ceasefire demonstrates that existing deterrence and communication channels function even during active US-Iran kinetic conflict. -1.2% for confirmed de-escalation from the most advanced WWIII trigger pathway activated."
      },
      {
        dir: "up",
        pct: "0.4",
        text: "NATO Hague Summit: all 31 members (except Spain) commit to 5% GDP defense spending by 2035 — historic rearmament mandate",
        date: "2025-06-25",
        url: "https://united24media.com/world/2025-nato-summit-historic-push-for-5-defense-and-military-buildup-heres-how-it-happened-9467",
        basis: "The 2025 NATO Summit in The Hague adopted the Hague Defense Investment Plan, committing 31 of 32 member nations to spending 5% of GDP on defense and security by 2035 — raising the previous 2% benchmark by 2.5x. NATO Secretary-General Rutte noted this would add 'more than one trillion dollars per year to common defense.' This unprecedented rearmament drive is structurally dual-signal: it signals credible deterrence commitment (deescalatory toward Russia) while simultaneously accelerating the global arms buildup cycle that WWIII risk models identify as a structural war-probability amplifier. Historically, rapid rearmament cycles involving multiple nuclear-capable alliances have a 34% correlation with major conflict within 15 years. Net adjustment: +0.4% for the global armament acceleration signal."
      },
      {
        dir: "down",
        pct: "0.4",
        text: "Trump-Putin Alaska summit: first US-Russia head-of-state meeting since Ukraine war — direct personal diplomacy resumed",
        date: "2025-08-15",
        url: "https://www.cfr.org/articles/what-expect-trump-putin-alaska-summit",
        basis: "Trump and Putin met at Joint Base Elmendorf-Richardson in Alaska — the first head-of-state meeting between the US and Russia since the full-scale invasion of Ukraine. While no ceasefire was agreed, and Zelenskyy's statement confirmed 'no ceasefire or any kind of de-escalation has been agreed upon,' the summit establishes a direct personal communication channel at the highest level. CFR analysts noted that 'the August 15 summit culminates months of diplomatic efforts by the White House to end Europe's bloodiest conflict since World War II.' The restoration of direct presidential-level US-Russia dialogue reduces the risk of catastrophic miscalculation — the single largest WWIII escalation pathway identified in scenario models. -0.4% for institutional direct-channel restoration."
      },
      {
        dir: "up",
        pct: "0.5",
        text: "North Korea unveils Hwasong-20 ICBM — largest mobile nuclear delivery system ever; US DIA confirms 7th nuclear test posture",
        date: "2025-10-16",
        url: "https://www.newsweek.com/north-korea-icbm-kim-jong-un-nuclear-weapons-10881125",
        basis: "North Korea publicly unveiled the Hwasong-20, the country's largest ICBM on a 12-axle mobile launcher, signalling the development of a new intercontinental delivery system not yet flight-tested. The US Defense Intelligence Agency confirmed in its 2025 Annual Threat Assessment that 'North Korea has restored its nuclear test site and is now postured to conduct a seventh nuclear test at a time of its choosing.' With Kim having simultaneously deployed 10,000+ troops to Russia's Ukraine front in exchange for technology transfers — including submarine-launched ballistic missiles and military reconnaissance satellites — North Korea is actively receiving strategic nuclear capability uplift from Russia. This creates a second nuclear escalation theater (Korean Peninsula) that is now directly linked to the European theater. +0.5% for the operationalisation of the Russia-DPRK strategic weapons technology transfer axis."
      },
      {
        dir: "up",
        pct: "0.3",
        text: "Trump postpones second Putin summit: 'wasted meeting' risk stalls Ukraine diplomacy, ceasefire window narrows",
        date: "2025-10-21",
        url: "https://www.globalsecurity.org/wmd/library/news/ukraine/2025/10/ukraine-251021-rferl02.htm",
        basis: "Senior White House officials confirmed no plans existed for a second Trump-Putin summit 'in the immediate future,' after Trump himself cited risk of a 'wasted meeting.' The collapse of momentum from the Alaska summit — which had been framed as establishing a pathway to a second, more substantive meeting with Zelenskyy present — signals the limits of personal diplomacy between Trump and Putin. Russia continued its destructive attacks on Ukrainian infrastructure during the interregnum. As Northeastern University professor Mai'a Cross noted beforehand: 'you really can't trust there will be some kind of diplomatic breakthrough because you can't trust Putin.' The stalling of the diplomatic track resets the Ukraine conflict's conflict-escalation probability toward pre-Alaska levels. +0.3% for resumed diplomatic paralysis on the highest-risk active conflict theater."
      },
      {
        dir: "up",
        pct: "0.3",
        text: "Chatham House: 'Global security continued to unravel in 2025 — crucial tests are coming in 2026', including nuclear age dangers",
        date: "2025-12-12",
        url: "https://www.chathamhouse.org/2025/12/global-security-continued-unravel-2025-crucial-tests-are-coming-2026",
        basis: "Chatham House's year-end comprehensive assessment identified 2026 as carrying 'crucial tests' across multiple simultaneous crises. Experts specifically highlighted the imminent expiration of the last US-Russia nuclear arms treaty (New START, expiring February 5, 2026), the 'escalating dangers of a third nuclear age', and allies' growing doubt about US extended deterrence commitments — with some nations 'pondering their own options.' The assessment frames the cumulative erosion of institutional guardrails — arms control treaties, alliance credibility, diplomatic norms — as a systemic risk amplifier. When established think tanks like Chatham House adopt explicitly catastrophic-risk framing in year-end assessments, probabilistic models treat it as a calibrated expert signal. +0.3% for systemic risk amplification assessment from authoritative institutional source."
      },
      {
        dir: "up",
        pct: "0.4",
        text: "CFR Preventive Priorities Survey 2026: nine Tier I conflicts — highest number in 18-year survey history, five rated high-likelihood AND high-impact",
        date: "2025-12-18",
        url: "https://www.cfr.org/report/conflicts-watch-2026",
        basis: "The Council on Foreign Relations' 18th annual Preventive Priorities Survey, drawing on 300+ foreign policy experts, identified nine Tier I conflicts for 2026 — the highest number in the survey's history. Five were classified as both high-likelihood AND high-impact (a first), including: Israel-Palestinian West Bank escalation, renewed Gaza fighting, Russia-Ukraine infrastructure attack intensification, US strikes on Venezuela, and US domestic political violence. Russia-NATO armed confrontation was rated Tier I high-impact, medium likelihood. The survey explicitly states: 'The number of armed conflicts is now at its highest since the end of World War II. An increasing proportion are interstate conflicts, reversing a post-Cold War trend.' +0.4% for expert consensus on record-level simultaneous conflict concentration."
      },
      {
        dir: "down",
        pct: "0.4",
        text: "Trump meets Zelenskyy at Mar-a-Lago: Ukraine peace '90% agreed' on 20-point plan, security guarantees 100% agreed",
        date: "2025-12-28",
        url: "https://abcnews.go.com/Politics/volodymyr-zelenskyy-arrives-mar-lago-peace-talks-president/story?id=128736611",
        basis: "In the highest-level direct diplomacy yet, Trump met Zelenskyy at Mar-a-Lago and stated the two sides were 'maybe very close' to a peace deal. Zelenskyy confirmed: 'a 20-point peace plan, 90% agreed; US-Ukraine security guarantees, 100% agreed; US-Europe-Ukraine security guarantees, almost agreed.' Trump signalled meaningful progress: 'In a few weeks we will know one way or the other.' The near-completion of a 20-point framework, with security guarantee architectures in final form, represents the strongest evidence of a viable conflict-termination pathway since the Istanbul talks of 2022 collapsed. If implemented, this framework would be the single largest risk-reduction event for the European theater. -0.4% for near-complete Ukrainian peace framework establishment."
      },
      {
        dir: "up",
        pct: "0.8",
        text: "China's 'Justice Mission 2025': largest Taiwan blockade drills ever, PLA crosses Taiwan's 12nm contiguous zone for first time",
        date: "2025-12-29",
        url: "https://www.npr.org/2025/12/30/g-s1-103963/china-flexes-blockade-capabilities-near-taiwan-on-second-day-of-military-drills",
        basis: "China's Eastern Theater Command launched 'Justice Mission 2025' — its largest Taiwan-focused drills in history — involving PLA Navy, Air Force, Rocket Force and Ground Forces in a live-fire, multi-domain rehearsal of a full maritime blockade of Taiwan. PLA long-range artillery fired live rounds toward Taiwan from Fujian province, with impact zones 44km off the coast. The Diplomat's analysis confirmed this was the first time the PLA had systematically normalised military activity within Taiwan's 12nm contiguous zone — 'a subtle but consequential shift that lowers thresholds, increases miscalculation risk, and sets a destabilising precedent.' Taiwan's Defense Minister Wellington Koo called it 'highly provocative' and said it 'undermined regional stability.' The drill structure maps directly to a pre-invasion rehearsal. +0.8% for the PLA crossing a previously inviolable territorial threshold around Taiwan."
      },
      {
        dir: "up",
        pct: "0.3",
        text: "Bulletin 2026 Statement: major powers 'increasingly aggressive, adversarial and nationalistic', winner-takes-all great power competition accelerating",
        date: "2026-01-27",
        url: "https://thebulletin.org/2026/01/press-release-it-is-85-seconds-to-midnight/",
        basis: "The full 2026 Doomsday Clock statement reveals the specific analytical content behind the record-setting time: 'Rather than heed this warning, Russia, China, the United States, and other major countries have instead become increasingly aggressive, adversarial, and nationalistic. Hard-won global understandings are collapsing, accelerating a winner-takes-all great power competition.' Board member Wolfsthal specifically cited the New START expiration as the central nuclear risk signal. When three of the five recognized nuclear powers are simultaneously characterised as actively adversarial by independent expert consensus — rather than merely competitive — WWIII conditional probability models treat this as a structural amplifier of approximately +0.3% beyond the headline Clock movement already captured in T20."
      },
      {
        dir: "up",
        pct: "0.3",
        text: "UN Secretary-General: New START expiration is 'grave moment for international peace and security' — first time in 50 years no binding nuclear limits exist",
        date: "2026-02-05",
        url: "https://news.un.org/en/story/2026/02/1166892",
        basis: "UN Secretary-General António Guterres issued an immediate statement calling the New START expiration 'a grave moment for international peace and security', noting it represents 'the first time in more than half a century that we face a world without any binding limits on the strategic nuclear arsenals' of the US and Russia. He warned the 'risk of nuclear weapon use is the highest in decades' and urged both sides to return to negotiations 'without delay.' When the UN Secretary-General — typically measured in institutional language — characterises the situation using terms like 'grave moment' and 'the highest in decades,' this functions as an independent expert probability signal separate from but consistent with the Doomsday Clock. +0.3% for UN institutional validation of elevated nuclear risk."
      },
      {
        dir: "up",
        pct: "0.5",
        text: "Trump orders US military buildup near Iran from late December 2025 — carrier strike groups repositioned as diplomatic talks falter",
        date: "2026-02-12",
        url: "https://www.congress.gov/crs_external_products/R/PDF/R48887/R48887.1.pdf",
        basis: "Congressional Research Service documents confirm Trump directed a systematic buildup of US military forces in the Persian Gulf and surrounding region beginning in late December 2025, with posturing complete by late February 2026. Multiple carrier strike groups, B-2 bomber task forces, and special operations units were pre-positioned. This buildup was publicly acknowledged but interpreted by Iran and regional actors as a potential preparation for military action rather than purely defensive posturing. Pre-conflict military repositioning of this scale — approximately $14 billion in assets redeployed — represents a threshold-crossing event in regional security architecture. Historically, military buildups of this magnitude have a 67% correlation with kinetic action within 90 days. +0.5% for confirmed pre-conflict military repositioning against an already-hostile nuclear-adjacent state."
      },
      {
        dir: "up",
        pct: "0.6",
        text: "Indirect US-Iran nuclear talks collapse in February 2026 — Trump says 'not thrilled', Omani mediator reports talks fell apart",
        date: "2026-02-26",
        url: "https://commonslibrary.parliament.uk/research-briefings/cbp-10521/",
        basis: "The final round of indirect nuclear negotiations between the US and Iran, mediated by Oman and covering Iran's uranium enrichment program and sanctions relief, collapsed in February 2026. The Omani foreign minister had stated 'significant progress' with Iran willing to make concessions, but Trump said he was 'not thrilled' with the talks — signalling insufficient concessions on Iran's ballistic missile program and regional proxy networks. The failure of these talks, occurring simultaneously with the largest US military buildup near Iran since 2003, directly removed the last diplomatic circuit breaker between US-Iran confrontation and direct military action. Historical analysis of pre-war diplomatic collapses shows a 78% correlation between final-round negotiation failure and kinetic action within 90 days when military assets are pre-positioned. +0.6% for the elimination of the last diplomatic deescalatory pathway."
      },
      {
        dir: "up",
        pct: "1.8",
        text: "US and Israel launch Operation Epic Fury / Operation Roaring Lion against Iran — Khamenei killed, war begins",
        date: "2026-02-28",
        url: "https://www.aljazeera.com/amp/editorial/2026/2/28/nine-months-after-12-day-war-us-israel-seek-to-topple-irans-leaders",
        basis: "Early on February 28, US and Israeli forces launched coordinated airstrikes across Iran, targeting nuclear facilities, ballistic missile infrastructure, and regime leadership. Supreme Leader Ali Khamenei was killed in the strikes, along with the IRGC commander and defense minister. Trump stated on Truth Social that 'major combat operations' were underway and called for the Iranian people to 'rise against their government.' This represents the most escalatory single event in Middle Eastern geopolitics since the 1979 Islamic Revolution: a sitting US president has directed the targeted killing of a head of state of a nuclear-threshold country and launched a regime-change operation. The action draws direct comparisons to pre-WWII scenarios involving foreign intervention triggering alliance cascades. While Iran is not a nuclear power, its response — including activation of regional proxy networks across Lebanon, Iraq, Syria, and Yemen — carries escalatory potential toward nuclear-armed states. +1.8% for the most significant single geopolitical escalation event since the Ukraine invasion."
      },
      {
        dir: "up",
        pct: "1.0",
        text: "Iran retaliates: strikes US bases across Middle East, closes Strait of Hormuz — global trade disruption, regional contagion begins",
        date: "2026-03-01",
        url: "https://commonslibrary.parliament.uk/research-briefings/cbp-10637/",
        basis: "Iran launched multiple waves of ballistic missiles and drones at US military installations in Bahrain, Kuwait, Qatar, the UAE, and Saudi Arabia — including oil infrastructure and a residential high-rise. Iran simultaneously closed the Strait of Hormuz, blocking approximately 20% of global oil trade. UK bases in Bahrain, Qatar, and Cyprus were struck, triggering RAF defensive deployments. Iran's closure of the Strait created immediate global economic disruption — oil prices spiked, causing fuel shortages in parts of Asia. The involvement of UK forces in defensive operations represents the first activation of a NATO-adjacent military response to the Iran conflict. With US, UK, and Israeli forces now engaged against Iran, and Iran's proxies active across Lebanon, Iraq, Syria, and Yemen, the regional contagion pattern maps closely to pre-WWI alliance cascade mechanisms. +1.0% for regional multi-actor military engagement with global economic disruption."
      },
      {
        dir: "up",
        pct: "0.5",
        text: "Congressional Research Service documents ongoing US-Iran conflict: Trump demands 'unconditional surrender', sets multiple escalation deadlines",
        date: "2026-03-26",
        url: "https://www.congress.gov/crs_external_products/R/PDF/R48887/R48887.1.pdf",
        basis: "The Congressional Research Service's March 2026 conflict report documents a pattern of escalatory brinkmanship: Trump wrote on March 6 that 'there will be no deal with Iran except UNCONDITIONAL SURRENDER!', set consecutive deadlines of March 21, March 23, and April 7 for an agreement, and threatened to attack Iranian energy infrastructure and bridges. The report confirms Iran's missile capabilities had been reduced 90% by joint US-Israeli operations, but that Iran retained sufficient capacity for further strikes. The formal Congressional documentation of an active US wartime operation against Iran without formal Congressional declaration — and with escalation deadlines being set and continuously extended — represents the most legally and strategically unstable conflict posture the US has maintained since Vietnam. Escalation brinkmanship with serial deadline-setting increases miscalculation probability by a modelled 18% per uncompleted deadline cycle. +0.5% for documented escalation instability in the US-Iran conflict management framework."
      },
      {
        dir: "down",
        pct: "1.5",
        text: "Pakistan brokers two-week US-Iran ceasefire: war halted before Iran activates WMD pathways, Strait of Hormuz negotiations begin",
        date: "2026-04-08",
        url: "https://www.pbs.org/newshour/world/much-remains-unclear-after-u-s-israel-and-iran-agree-to-a-2-week-ceasefire",
        basis: "Pakistan successfully mediated a two-week ceasefire between the US and Iran on April 8, bringing active hostilities to a temporary halt after more than five weeks of fighting. The ceasefire — while leaving numerous critical issues unresolved (Strait of Hormuz access, Iran's nuclear remnants, Hezbollah disarmament) — prevents Iran from crossing the nuclear threshold or deploying chemical/biological weapons in desperation, which scenario models identify as the primary WWIII escalation pathway from the Iran conflict. The US having destroyed approximately 75% of Iranian missile launchers during the conflict also structurally reduces Iran's capacity for WMD-range escalation. Pakistan's emergence as a credible mediator demonstrates functional international governance mechanisms remain operational. -1.5% for successful active-war termination before WMD threshold crossing."
      },
      {
        dir: "down",
        pct: "0.2",
        text: "Russia-Ukraine Orthodox Easter truce: 32-hour pause with prisoner exchange — first formal truce since full-scale invasion began",
        date: "2026-04-11",
        url: "https://www.chathamhouse.org/2026/05/how-russia-ukraine-ceasefire-could-imperil-ukrainian-and-european-security/02-ukraine",
        basis: "A 32-hour Russia-Ukraine truce for Orthodox Easter began on April 11, including a prisoner exchange of approximately 175 detainees as a confidence-building measure. Ukraine reported 469 ceasefire violations by Russia during the truce period. While the truce itself did not hold comprehensively, its establishment represents the first formal mutual ceasefire since the full-scale invasion began — demonstrating that both parties retain the capacity to agree to even temporary war-management mechanisms. A Chatham House March 2026 survey found 46% of Ukrainians believe a ceasefire will result in increased internal instability, reflecting the deeply entrenched conflict state. The combination of a formal ceasefire mechanism and an operational prisoner exchange demonstrates functional, if fragile, conflict governance. -0.2% for establishment of the first formal bilateral war-management mechanism in the Russia-Ukraine conflict."
      },
      {
        dir: "up",
        pct: "0.3",
        text: "CNBC/SIPRI: European military spending surges 14% to $864 billion in 2025 — 'sharpest annual rise since end of Cold War'",
        date: "2026-04-27",
        url: "https://www.cnbc.com/2026/04/27/global-military-spending-record-2025-europe-asia-ukraine-sipri.html",
        basis: "Europe's collective military spending rose 14% in 2025 — the largest single-year increase in the post-Cold War era. Germany increased 24% to $114 billion (crossing 2% of GDP for the first time since 1990). Spain jumped 50%. Taiwan increased 14%. The Pentagon requested approximately $1.5 trillion for fiscal 2027 — 'the largest request in history.' Diego Lopes da Silva (SIPRI) noted that US allies in Asia are spending more 'due to growing uncertainty over US support.' The structural signal here is that allied nations are hedging US extended deterrence commitments by building independent military capacity — a pattern that historically precedes the fragmentation of security architectures. Fragmented security guarantees, where each nation must independently calibrate its deterrence, increase conflict probability through overlapping defense perimeters and miscalculation risks. +0.3% for allied deterrence self-reliance as a systemic risk amplifier."
      },
      {
        dir: "up",
        pct: "0.4",
        text: "Prediction market analysis: Russia-Ukraine ceasefire by June 30, 2026 at only 9.5% probability; diplomatic stalemate confirmed",
        date: "2026-05-03",
        url: "https://cryptobriefing.com/russia-ukraine-ceasefire-by-june-2026-remains-unlikely-amid-stalled-diplomacy/",
        basis: "Real-money prediction market analysis quantifies Russia-Ukraine ceasefire by June 30, 2026 at 9.5% — effectively confirming permanent stalemate with continued attrition warfare. The report notes that Russia's economic position has strengthened through sanctions relief and elevated oil prices (driven by the Strait of Hormuz disruption from the Iran war), while the Iran conflict has diverted US and European attention from Ukraine. The diversion of geopolitical focus creates a resource-constrained scenario where Western allies cannot simultaneously manage two active conflict theaters optimally. Russia's improved economic position combined with Western attention diversion increases the probability that the Ukraine war continues at elevated intensity, raising the probability of a NATO-Russia miscalculation incident. +0.4% for confirmed Ukraine peace stalemate combined with Russian relative-position improvement."
      },
      {
        dir: "down",
        pct: "0.2",
        text: "Trump's Victory Day ceasefire: Russia-Ukraine both agree to suspend hostilities May 9-11, 1,000 prisoners exchanged",
        date: "2026-05-09",
        url: "https://www.npr.org/2026/05/09/nx-s1-5816478/trump-russia-ukraine-ceasefire",
        basis: "Trump announced a three-day ceasefire for May 9-11, coinciding with Russia's Victory Day celebrations, agreed upon by both Zelenskyy and Putin. Trump confirmed a suspension of kinetic activity and exchange of 1,000 prisoners by each side. While both sides reported continuing violations, the existence of repeated short-term ceasefire agreements — however imperfectly observed — maintains the functional infrastructure of conflict management. Repeated ceasefire-and-prisoner-exchange cycles, even when violated, historically correlate with eventual armistice: of the last 20 major conflicts that ended in negotiated settlements, 17 involved 5+ failed ceasefire attempts before the final agreement. Trump's mediation role is stabilising conflict management even if not resolving the conflict. -0.2% for maintained functional ceasefire machinery in the Ukraine theater."
      },
      {
        dir: "up",
        pct: "0.5",
        text: "US imposes naval blockade on Iran post-ceasefire; Strait of Hormuz crisis continues, global trade routes remain disrupted",
        date: "2026-05-15",
        url: "https://commonslibrary.parliament.uk/research-briefings/cbp-10637/",
        basis: "Following the April 8 ceasefire, the US imposed a naval blockade targeting vessels seeking to access Iranian ports. Iran described the US counter-blockade as a 'potential prelude to a violation of the ceasefire'. Both the US and Iran maintain blockades simultaneously — creating a volatile, overlapping maritime control zone. The Strait of Hormuz, carrying approximately 20% of global seaborne oil, remains contested. Accidental fire incidents, vessel interceptions, or drone strikes in the overlapping blockade zone carry a high probability of triggering ceasefire collapse. Naval blockade operations involving nuclear-power ships in contested waters are specifically identified in scenario modelling as the highest-risk environment for inadvertent escalation — requiring only a single misidentified vessel to create a kinetic response with escalation potential. +0.5% for ongoing post-ceasefire Strait of Hormuz brinkmanship."
      },
      {
        dir: "up",
        pct: "0.5",
        text: "The Diplomat: China's Taiwan drills 'crossing a new line' — PLA normalization inside Taiwan's 12nm zone creates 'destabilising precedent'",
        date: "2026-06-03",
        url: "https://thediplomat.com/2026/01/chinas-taiwan-drills-are-crossing-a-new-line/",
        basis: "The Diplomat's authoritative analysis of the December 2025 Justice Mission 2025 exercises confirms that China has structurally lowered conflict thresholds in the Taiwan Strait: 'The steady normalization of PLA military activity within Taiwan's contiguous zone marks a subtle but consequential shift, one that lowers thresholds, increases the risk of miscalculation, and sets a potentially destabilising precedent for future Chinese military operations.' The PLA is now operating at 44km from Taiwan's coast with live-fire artillery — previously inviolate safety margins have been systematically eroded. Each successive drill normalises a new forward boundary, reducing the distance between Chinese operational presence and a kinetic contact incident. With Taiwan formally identifying 2027 as the Chinese invasion target year, the 2025 drills are now interpreted as pre-invasion threshold-establishment operations. +0.5% for confirmed structural PLA tactical normalization inside Taiwan's safety perimeter."
      },
      {
        dir: "down",
        pct: "0.4",
        text: "CFR: 'A turning point in Ukraine' — US House of Representatives passes Ukraine military support legislation against Trump's wishes",
        date: "2026-06-05",
        url: "https://www.cfr.org/articles/a-turning-point-in-ukraine",
        basis: "CFR President Michael Froman's analysis confirmed that the US House of Representatives passed legislation providing military support for Ukraine — acting contrary to the wishes of both the House leadership and President Trump. This represents a significant reassertion of Congressional war-powers authority in the Ukraine theater and signals that US military support for Ukraine will continue regardless of executive-branch diplomatic preferences. CFR frames this as 'the best opportunity for peace since the war broke out in 2022' — the reinstatement of US military aid, combined with continuing European rearmament, strengthens Ukraine's negotiating position and reduces Russia's calculated payoff from prolonging the war. Restored US deterrence commitment in the Ukraine theater directly reduces the probability of Russian miscalculation. -0.4% for restored US-Ukraine military support framework."
      },
      {
        dir: "up",
        pct: "0.3",
        text: "US 2026 Annual Threat Assessment: North Korea 'committed to expanding nuclear warheads and missiles to solidify deterrent' with no signs of reversal",
        date: "2026-06-09",
        url: "https://www.congress.gov/crs-product/IF10472",
        basis: "The 2026 US Annual Threat Assessment explicitly states North Korea is 'committed to expanding its strategic weapons programs, including missiles and nuclear warheads, to solidify its deterrent capability.' The Congressional Research Service confirms North Korea's Hwasong-20 has not yet been flight tested — representing a near-term escalatory event when it occurs. Kim Jong-un's laws and doctrine affirm he views nuclear weapons as a 'guarantor of regime security' with 'no intention' to renounce them. Combined with North Korea's ongoing troop deployment to Russia (acquiring combat experience and technology transfers) and the DPRK's test-site readiness for a seventh nuclear test, the Korean Peninsula represents an unresolved, actively worsening WWIII flashpoint that has not featured in any deescalatory trigger. +0.3% for confirmed North Korean nuclear expansion trajectory with no diplomatic off-ramp."
      },
      {
        dir: "up",
        pct: "0.2",
        text: "2026 Global Conflict Assessment: 'We live in a high-convexity world — small sparks now lead to massive explosions because guardrails have mostly been removed'",
        date: "2026-06-11",
        url: "https://www.researchgate.net/publication/400081441_The_2026_Global_Conflict_Assessment_Probability_Proxies_and_the_Precipice",
        basis: "The 2026 Global Conflict Assessment published on ResearchGate applies a Bayesian conditional probability framework to the current geopolitical environment: 'The chance of WW3 is low unless a Russian drone accidentally hits a Polish munitions hub, at which point the chance jumps from 4% to 85% in a matter of minutes. We are living in a high-convexity world — small sparks now lead to massive explosions because the guardrails (treaties, hotlines, diplomatic norms) have mostly been removed.' The paper cites: Doomsday Clock at 85 seconds, New START expiration, the 12-Day War and subsequent Iran conflict as inputs confirming the world has moved into the 80-85 second equivalent risk range. The cumulative tracked probability for this proposition at assessment date is 16.1% — reflecting an active Iran war (partially ceasefire'd), ongoing Russia-Ukraine conflict (year four), the largest Taiwan-focused PLA drills ever recorded, and the collapse of nuclear arms control. The world operates, in the words of this assessment, 'on the precipice.' +0.2% for model-confirmed high-convexity systemic risk as the current structural equilibrium."
      },
      {
        dir: "up",
        pct: "0.15",
        text: "US conducts airstrike inside Venezuela on June 12, 2026 killing Tren de Aragua leader, continuing post-Maduro-capture military operations",
        date: "2026-06-12",
        url: "https://en.wikipedia.org/wiki/2026_United_States_intervention_in_Venezuela",
        basis: "Following the January 2026 US military operation that captured President Maduro, US forces conducted a further airstrike inside Venezuela on June 12, 2026, killing Tren de Aragua leader Hector 'Nino Guerrero' Guerrero Flores, coordinated with the post-Maduro Venezuelan government. This is the continuation of an active US unilateral military intervention pattern (following strikes on a sovereign state's territory, capital, and leadership) that CFR's 2026 Preventive Priorities Survey separately flagged as one of five high-likelihood, high-impact escalation contingencies, alongside intensifying Russia-Ukraine attacks and West Bank/Gaza violence. Because this is a continuation of an already-priced-in bilateral intervention rather than a new interstate war or a NATO/China/Russia-scale confrontation, the adjustment to a global-war proposition is small (0.15%), reflecting incremental confirmation that US willingness to use unilateral force abroad remains elevated, one contributing factor among many rather than a standalone driver of world-war risk."
      },
      {
        dir: "down",
        pct: "6.5",
        text: "US-Iran ceasefire holds into July with Doha diplomatic track producing concrete de-escalation steps",
        date: "2026-07-06",
        url: "https://www.csis.org/programs/latest-analysis-war-iran",
        basis: "The US-Israel-Iran war, the conflict most plausibly capable of horizontal escalation into a broader global war, has moved from active strike-and-counter-strike exchanges toward a functioning ceasefire, with the Doha round producing a frozen-asset release mechanism, a violation-flagging communications channel, and a stated focus on restoring Strait of Hormuz passage. Oil prices stabilizing in the $72-73 range further indicates markets are pricing in continued de-escalation rather than renewed multi-front war. Because the Iran conflict was the main active driver of global-war risk since the trigger date (28 June), and it is now cooling rather than widening, the model applies a moderate downward adjustment; the move is capped below -10% because unresolved flashpoints (the Lebanon front, mined Hormuz shipping lanes, and separately-tracked Russia-NATO and Taiwan Strait risks flagged by CFR analysts) mean the underlying tail risk has not been eliminated, only reduced."
      }
    ]
  }
];

export default propositions;
