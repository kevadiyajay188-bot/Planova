function isoDaysFromNow(days, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function createSeedData() {
  const now = new Date().toISOString();
  return {
    version: 2,
    clubs: [],
    memberships: [],
    users: [],
    sessions: [],
    rsvps: [],
    settings: {},
    events: [
      {
        id: 'evt-technova',
        name: 'TechNova Hackathon 2026',
        type: 'Hackathon',
        eventDate: isoDaysFromNow(12),
        percentComplete: 68,
        phase: 'Logistics',
        riskLevel: 'critical',
        riskSummary: 'Auditorium AC permission pending',
        status: 'in_progress',
        expectedAttendance: 500,
        budgetPlanned: 12000,
        venue: 'Central Auditorium',
        topMembers: [
          { name: 'Priya Patel', initials: 'PP', bg: 'bg-emerald-600' },
          { name: 'Arjun Rao', initials: 'AR', bg: 'bg-slate-800' },
          { name: 'Neha Sharma', initials: 'NS', bg: 'bg-zinc-700' }
        ],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'evt-roboquest',
        name: 'RoboQuest Championship',
        type: 'Competition',
        eventDate: isoDaysFromNow(24),
        percentComplete: 45,
        phase: 'Promotion',
        riskLevel: 'medium',
        riskSummary: 'Sponsorship confirmation delayed',
        status: 'in_progress',
        expectedAttendance: 450,
        budgetPlanned: 9000,
        venue: 'Indoor Sports Complex Arena',
        topMembers: [
          { name: 'Dev Malik', initials: 'DM', bg: 'bg-cyan-700' },
          { name: 'Kavya Sen', initials: 'KS', bg: 'bg-amber-600' },
          { name: 'Rohan Jha', initials: 'RJ', bg: 'bg-rose-600' }
        ],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'evt-mixer',
        name: 'Alumni Mentorship Mixer',
        type: 'Networking',
        eventDate: isoDaysFromNow(38),
        percentComplete: 20,
        phase: 'Approvals',
        riskLevel: 'low',
        riskSummary: 'Guest speaker invites sent',
        status: 'upcoming',
        expectedAttendance: 120,
        budgetPlanned: 5000,
        venue: 'Faculty Lounge & Courtyard',
        topMembers: [
          { name: 'Tanvi G', initials: 'TG', bg: 'bg-slate-700' },
          { name: 'Siddharth V', initials: 'SV', bg: 'bg-slate-900' },
          { name: 'Ananya M', initials: 'AM', bg: 'bg-teal-700' }
        ],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'evt-designsprint',
        name: 'DesignSprint UI Workshop',
        type: 'Workshop',
        eventDate: isoDaysFromNow(-7),
        percentComplete: 100,
        phase: 'Execution',
        riskLevel: 'low',
        riskSummary: 'All milestones completed',
        status: 'completed',
        expectedAttendance: 80,
        budgetPlanned: 3500,
        actualSpent: 3250,
        venue: 'Design Lab 4B',
        topMembers: [
          { name: 'Aarav Shah', initials: 'AS', bg: 'bg-slate-800' },
          { name: 'Sneha Roy', initials: 'SR', bg: 'bg-zinc-700' },
          { name: 'Karan Mehta', initials: 'KM', bg: 'bg-slate-900' }
        ],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'evt-technova-2025',
        name: 'TechNova Hackathon 2025',
        type: 'Hackathon',
        eventDate: isoDaysFromNow(-365),
        percentComplete: 100,
        phase: 'Execution',
        riskLevel: 'low',
        riskSummary: 'Archived after successful run',
        status: 'completed',
        expectedAttendance: 480,
        actualAttendance: 512,
        budgetPlanned: 11000,
        actualSpent: 11850,
        venue: 'Central Auditorium',
        topMembers: [
          { name: 'Priya Patel', initials: 'PP', bg: 'bg-emerald-600' },
          { name: 'Arjun Rao', initials: 'AR', bg: 'bg-slate-800' }
        ],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'evt-roboquest-2025',
        name: 'RoboQuest 2025',
        type: 'Competition',
        eventDate: isoDaysFromNow(-300),
        percentComplete: 100,
        phase: 'Execution',
        riskLevel: 'low',
        riskSummary: 'Archived post-competition',
        status: 'completed',
        expectedAttendance: 400,
        actualAttendance: 425,
        budgetPlanned: 8500,
        actualSpent: 9100,
        venue: 'Indoor Sports Complex Arena',
        topMembers: [
          { name: 'Dev Malik', initials: 'DM', bg: 'bg-cyan-700' },
          { name: 'Kavya Sen', initials: 'KS', bg: 'bg-amber-600' }
        ],
        createdAt: now,
        updatedAt: now
      }
    ],
    tasks: [
      ...Array.from({ length: 41 }, (_, index) => ({
        id: `task-done-${index + 1}`,
        title: `Completed task ${index + 1}`,
        category: index % 3 === 0 ? 'Logistics' : index % 3 === 1 ? 'Design' : 'Technical',
        status: 'done',
        dueDate: isoDaysFromNow(-1),
        completionDays: 3 + (index % 5),
        assigneeId: null
      })),
      ...Array.from({ length: 14 }, (_, index) => ({
        id: `task-doing-${index + 1}`,
        title: `In-progress task ${index + 1}`,
        category: index % 2 === 0 ? 'Logistics' : 'Marketing',
        status: 'doing',
        dueDate: isoDaysFromNow((index % 7) + 1),
        assigneeId: index % 2 === 0 ? 'vol-1' : 'vol-2'
      })),
      ...Array.from({ length: 5 }, (_, index) => ({
        id: `task-review-${index + 1}`,
        title: `Review task ${index + 1}`,
        category: 'Sponsorship',
        status: 'review',
        dueDate: isoDaysFromNow((index % 5) + 1),
        assigneeId: 'vol-3'
      })),
      ...Array.from({ length: 2 }, (_, index) => ({
        id: `task-blocked-${index + 1}`,
        title: `Blocked task ${index + 1}`,
        category: 'Permissions',
        status: 'blocked',
        dueDate: isoDaysFromNow(-2),
        assigneeId: 'vol-1'
      })),
      ...Array.from({ length: 6 }, (_, index) => ({
        id: `task-todo-${index + 1}`,
        title: `To-do task ${index + 1}`,
        category: 'Operations',
        status: 'todo',
        dueDate: isoDaysFromNow(index + 1),
        assigneeId: null
      }))
    ],
    risks: [
      { id: 'risk-1', title: 'Auditorium permission pending', severity: 'Critical', status: 'open', likelihood: 'High', mitigation: 'Submit dean escalation letter and request expedited Dean approval' },
      { id: 'risk-2', title: 'Sponsorship confirmation delayed', severity: 'High', status: 'open', likelihood: 'High', mitigation: 'Follow up with tier-2 sponsors and provide 10% early bird booth discount' },
      { id: 'risk-3', title: 'Volunteer availability conflict', severity: 'High', status: 'open', likelihood: 'Medium', mitigation: 'Redistribute workload from overloaded volunteers to new batch recruits' },
      { id: 'risk-4', title: 'Vendor response time', severity: 'Medium', status: 'open', likelihood: 'Medium', mitigation: 'Secure backup AV equipment rental vendor' },
      { id: 'risk-5', title: 'Backup power check', severity: 'Medium', status: 'open', likelihood: 'Low', mitigation: 'Coordinate with campus electrical team 5 days prior' },
      { id: 'risk-6', title: 'Signage draft review', severity: 'Medium', status: 'open', likelihood: 'Low', mitigation: 'Finalize banner and stage backdrop prints 7 days before execution' },
      { id: 'risk-7', title: 'Speaker travel timing', severity: 'Medium', status: 'open', likelihood: 'Medium', mitigation: 'Assign a volunteer escort for airport pickup and hospitality' },
      { id: 'risk-8', title: 'Refreshment estimates', severity: 'Low', status: 'open', likelihood: 'Low', mitigation: 'Lock attendee head-count 48 hours before catering delivery' }
    ],
    volunteers: [
      { id: 'vol-1', name: 'Priya P.', email: 'priya@campus.edu', activeTasks: 8, skills: ['Stage Management', 'Logistics', 'Speaker Coordination'], availability: ['Saturday morning', 'Sunday all day'], department: 'Computer Science', experienceEvents: 4 },
      { id: 'vol-2', name: 'Arjun R.', email: 'arjun@campus.edu', activeTasks: 7, skills: ['Sponsorship', 'Finance', 'Budgeting'], availability: ['Friday afternoon', 'Saturday all day'], department: 'Electrical Engineering', experienceEvents: 3 },
      { id: 'vol-3', name: 'Dev M.', email: 'dev@campus.edu', activeTasks: 5, skills: ['Technical Setup', 'Arena Planning', 'Hardware'], availability: ['Saturday morning', 'Saturday evening'], department: 'Mechanical Engineering', experienceEvents: 2 },
      { id: 'vol-4', name: 'Neha S.', email: 'neha@campus.edu', activeTasks: 4, skills: ['Poster Design', 'Social Media', 'Marketing'], availability: ['Weekdays flexible', 'Saturday morning'], department: 'Design', experienceEvents: 2 },
      { id: 'vol-5', name: 'Kavya S.', email: 'kavya@campus.edu', activeTasks: 3, skills: ['Registration', 'Hospitality', 'Volunteer Coordination'], availability: ['Saturday morning', 'Sunday all day'], department: 'Biotech', experienceEvents: 1 },
      { id: 'vol-6', name: 'Tanvi G.', email: 'tanvi@campus.edu', activeTasks: 2, skills: ['Stage Setup', 'Sound Check', 'Logistics'], availability: ['Saturday morning', 'Sunday afternoon'], department: 'Civil Engineering', experienceEvents: 1 },
      { id: 'vol-7', name: 'Aman K.', email: 'aman@campus.edu', activeTasks: 1, skills: ['Stage Management', 'Logistics', 'Registration'], availability: ['Saturday morning', 'Saturday afternoon', 'Sunday all day'], department: 'Computer Science', experienceEvents: 1 },
      { id: 'vol-8', name: 'Rahul V.', email: 'rahul@campus.edu', activeTasks: 9, skills: ['Technical Setup', 'AV', 'Logistics'], availability: ['Saturday all day'], department: 'Electrical Engineering', experienceEvents: 3 }
    ],
    meetings: [
      { id: 'meeting-1', title: 'Core Sync', occurredAt: isoDaysFromNow(-2), minutesLogged: true, transcript: 'Priya: We need to submit the central auditorium permission letter by tomorrow morning. Arjun: I will confirm the title sponsorship deal with DevRel sponsors by Thursday. Dev: I have checked the arena power outlets for RoboQuest.' }
    ],
    documents: [
      {
        id: 'doc-1',
        name: 'TechNova_2025_PostMortem.md',
        title: 'TechNova 2025 Post-Mortem & Budget Report',
        status: 'ready',
        content: `TechNova 2025 Post-Mortem & Financial Summary:
- Total registered participants: 512 across 48 teams.
- Overall Budget: Planned $11,000, Actual Spent $11,850.
- Sound and stage setup incurred an overrun of $650 due to late acoustic adjustments in Central Auditorium. We spent $2,800 on sound and audio-visual engineering last year.
- Permission Delays: The Central Auditorium AC permission letter was submitted only 7 days before the event, resulting in a near-cancellation. Recommendation for future events: Submit venue permissions at least 14 days in advance.
- Sponsorship: Successfully raised $7,500 from 4 tech partners.
- Key delayed tasks: Stage Banner Printing (delayed 3 days), Catering Confirmation (delayed 2 days).
- Registration team handled 500+ check-ins within 45 minutes using digital QR wristbands.`
      },
      {
        id: 'doc-2',
        name: 'Venue_Permissions_Guidelines.pdf',
        title: 'Campus Central Auditorium Permission SOP',
        status: 'ready',
        content: `Standard Operating Procedure for Venue & Facilities Permissions:
1. All club events in the Central Auditorium require written approval from the Dean of Student Affairs and the Estate Office.
2. Applications must be submitted at least 14 calendar days prior to the event date.
3. Air Conditioning and backup diesel generator permissions must be specifically requested on Form 4B.
4. Late submissions (less than 10 days) risk being rejected or subjected to emergency surcharge fees.
5. Sound checks are strictly restricted to between 6:00 PM and 9:00 PM on the day preceding the event.`
      },
      {
        id: 'doc-3',
        name: 'RoboQuest_2025_Summary.md',
        title: 'RoboQuest 2025 Arena & Sponsorship Review',
        status: 'ready',
        content: `RoboQuest 2025 Operations Summary:
- Total participating robots: 64 across 3 weight categories.
- Budget: Planned $8,500, Spent $9,100.
- High-expense categories: Arena perimeter polycarbonate barriers ($3,200) and prize pool ($3,500).
- Key Risk Encountered: Arena power tripping during semifinal match 4 due to insufficient dedicated 15A circuits. Mitigation: Always test dedicated 3-phase line 48 hours prior.
- Sponsorship confirmation delayed by 12 days, forcing the club to use emergency contingency funds for arena plywood.`
      },
      {
        id: 'doc-4',
        name: 'Volunteer_Roster_Guidelines.xlsx',
        title: 'IEEE Student Branch Volunteer Workload & Role Guidelines',
        status: 'ready',
        content: `IEEE Club Operations — Volunteer Allocation Policy:
- Maximum healthy active task load per volunteer is 6 tasks. Volunteers with >6 tasks are marked as Overloaded.
- Rebalancing protocol: When assigning new critical tasks, check active workloads. Reassign tasks from volunteers with >=7 tasks to available volunteers with <=3 tasks.
- Roles: Stage Management requires prior shadowing experience; Sponsorship requires finance coordinator sign-off.`
      }
    ],
    announcements: [
      {
        id: 'ann-technova-2026',
        eventId: 'evt-technova',
        title: 'TechNova Hackathon 2026: Applications Now Open!',
        clubName: 'IEEE Student Branch',
        collegeName: 'National Institute of Technology',
        category: 'Hackathon',
        coverPhotoUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
        preview: 'Join 350+ hackers for 36 hours of non-stop building, $10,000 prize pool, and 1-on-1 mentorship from top tech companies.',
        body: 'TechNova 2026 registration is officially live! Planova’s flagship 36-hour hackathon brings together student developers, designers, and innovators from across 40+ colleges.\n\nTracks include Generative AI Systems, Decentralized Apps, IoT & Hardware, and Social Impact Tech. Mentors from top engineering teams will be on-site 24/7, with hardware kits, cloud computing credits, and meals provided throughout the event. Form teams of 2 to 4 students. Limited seats available — RSVP early to guarantee your participation kit.',
        venue: 'Central Auditorium, Tech Campus',
        eventDate: isoDaysFromNow(12, 9),
        postedAt: isoDaysFromNow(-1, 14),
        saved: false,
        scale: 'national',
        featured: true,
        isMyClub: true,
        registrationUrl: 'https://technova.campus.edu/register',
        // Legacy admin compatibility
        audience: 'All Students & Campuses',
        content: 'Registrations for TechNova 2026 are officially live! 36 hours of hacking and $10k in prizes.'
      },
      {
        id: 'ann-roboquest-2026',
        eventId: 'evt-roboquest',
        title: 'RoboQuest Championship: Arena Combat Finalists Announced',
        clubName: 'Robotics & Automation Society',
        collegeName: 'Apex Institute of Engineering',
        category: 'Technical',
        coverPhotoUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
        preview: '64 autonomous line-followers and combat bots battle it out in the high-voltage arena. Free audience passes available.',
        body: 'The countdown to RoboQuest Arena Finals has begun! Witness custom-built combat bots up to 5kg and precision line-follower bots navigate high-speed obstacle tracks.\n\nOpen exhibition booths will showcase student drone prototypes, robotic arms, and computer vision systems. High-voltage battle rounds kick off Saturday morning. Safety goggles and wristbands will be issued at the arena entrance.',
        venue: 'Indoor Sports Complex Arena',
        eventDate: isoDaysFromNow(24, 10),
        postedAt: isoDaysFromNow(-2, 11),
        saved: true,
        scale: 'state',
        featured: true,
        isMyClub: false,
        registrationUrl: 'https://roboquest.apex.edu/tickets',
        audience: 'Campus Tech Enthusiasts',
        content: 'RoboQuest Championship finalists declared. Spectator passes now open.'
      },
      {
        id: 'ann-kalakriti-2026',
        eventId: 'evt-kalakriti',
        title: 'Kalakriti Annual Cultural Gala & Stage Revelry',
        clubName: 'Fine Arts & Drama Society',
        collegeName: 'Metropolitan University',
        category: 'Cultural',
        coverPhotoUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
        preview: 'Two days of live concerts, theatrical drama, fashion spotlight, and street dance battles with over 3,000 student attendees.',
        body: 'Immerse yourself in Kalakriti 2026, the biggest inter-college cultural celebration of the season! Highlights include the Grand Battle of the Bands, classical dance fusion, street play showdowns, and acoustic night under the stars.\n\nFood trucks and artisan student pop-up shops will line the promenade. Entry is complimentary with student badge registration.',
        venue: 'Open Air Amphitheatre',
        eventDate: isoDaysFromNow(18, 17),
        postedAt: isoDaysFromNow(-3, 16),
        saved: false,
        scale: 'state',
        featured: true,
        isMyClub: false,
        registrationUrl: 'https://kalakriti.metro.edu/entry',
        audience: 'All Students',
        content: 'Kalakriti 2026 lineup unveiled! Register for your entry pass today.'
      },
      {
        id: 'ann-designsprint-2026',
        eventId: 'evt-designsprint',
        title: 'UI/UX DesignSprint Workshop: From Figma to Production',
        clubName: 'Design & Creative Guild',
        collegeName: 'National Institute of Technology',
        category: 'Workshop',
        coverPhotoUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
        preview: 'Hands-on product design sprint led by design leads from top tech firms. Build responsive design systems and prototype in real-time.',
        body: 'Level up your design craft! Join this intensive 1-day masterclass covering atomic design systems, micro-interactions, accessibility guidelines, and Figma auto-layout secrets.\n\nAll attendees receive starter Figma UI kits, case study templates, and certificate of completion. Please bring your laptop with Figma desktop app installed.',
        venue: 'Media Innovation Lab, Hall 4',
        eventDate: isoDaysFromNow(5, 14),
        postedAt: isoDaysFromNow(-1, 9),
        saved: false,
        scale: 'college',
        featured: false,
        isMyClub: true,
        registrationUrl: 'https://designguild.campus.edu/sprint',
        audience: 'Design & Tech Students',
        content: 'DesignSprint workshop open for registrations. Figma installed required.'
      },
      {
        id: 'ann-futsal-2026',
        eventId: 'evt-futsal',
        title: 'Inter-University Futsal & Athletics League 2026',
        clubName: 'Campus Athletics Board',
        collegeName: 'State Sports Academy',
        category: 'Sports',
        coverPhotoUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1200&q=80',
        preview: '16 collegiate teams compete for the prestigious Chancellor’s Trophy. High-octane knockout fixtures under the floodlights.',
        body: 'The Inter-University League returns with fast-paced futsal under the arena floodlights, track sprints, and volleyball championships. Come cheer for your college squad as rival campuses clash for the championship trophy!\n\nRefreshment zones and live commentary stations will be set up around the sports pavilion.',
        venue: 'University Sports Complex, Pitch 1',
        eventDate: isoDaysFromNow(8, 16),
        postedAt: isoDaysFromNow(-4, 10),
        saved: false,
        scale: 'national',
        featured: true,
        isMyClub: false,
        registrationUrl: 'https://athletics.sports.edu/fixtures',
        audience: 'Sports Fans & Athletes',
        content: 'Fixtures announced for the Inter-University Futsal League 2026.'
      },
      {
        id: 'ann-ai-seminar-2026',
        eventId: 'evt-ai-seminar',
        title: 'Agentic Intelligence Seminar: Keynote by Dr. Aris Thorne',
        clubName: 'ACM Student Chapter',
        collegeName: 'National Institute of Technology',
        category: 'Seminar',
        coverPhotoUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80',
        preview: 'Distinguished Research Scientist Dr. Aris Thorne discusses distributed multi-agent intelligence and real-time reasoning architectures.',
        body: 'We are honored to host Dr. Aris Thorne, pioneering researcher in Distributed Autonomous Systems, for an exclusive campus colloquium. The talk will demystify multi-agent coordination, deterministic execution boundaries, and the future of human-AI collaboration in software engineering.\n\nA 30-minute interactive Q&A will follow the keynote, with networking coffee for researchers and students.',
        venue: 'Auditorium Hall B',
        eventDate: isoDaysFromNow(15, 11),
        postedAt: isoDaysFromNow(-2, 8),
        saved: false,
        scale: 'college',
        featured: false,
        isMyClub: true,
        registrationUrl: 'https://acm.campus.edu/thorne-keynote',
        audience: 'CS & AI Students',
        content: 'Dr. Aris Thorne keynote on Agentic Machine Systems scheduled for this month.'
      },
      {
        id: 'ann-springfest-2026',
        eventId: 'evt-springfest',
        title: 'Spring Carnival & Tech Expo 2026',
        clubName: 'Student Activity Council',
        collegeName: 'Skyline Campus',
        category: 'Fest',
        coverPhotoUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
        preview: 'Carnival games, drone light show, live acoustic indie bands, and student entrepreneur startup booths across campus lawns.',
        body: 'Planova presents the annual Spring Carnival! A vibrant outdoor festival featuring 30+ interactive game stalls, laser tag arenas, student innovation booths, and delicious gourmet food pop-ups.\n\nThe evening concludes with a synchronized 100-drone aerial light show set to music over the campus quad.',
        venue: 'South Lawn Promenade',
        eventDate: isoDaysFromNow(21, 15),
        postedAt: isoDaysFromNow(-5, 12),
        saved: false,
        scale: 'state',
        featured: false,
        isMyClub: false,
        registrationUrl: 'https://springfest.skyline.edu/passes',
        audience: 'Entire Campus Community',
        content: 'Spring Carnival & Tech Expo scheduled. Grab your early-bird carnival wristband.'
      },
      {
        id: 'ann-green-drive-2026',
        eventId: 'evt-greencampus',
        title: 'Green Earth Campus Drive: 1,000 Saplings Initiative',
        clubName: 'Rotaract & Eco Action Club',
        collegeName: 'National Institute of Technology',
        category: 'Social',
        coverPhotoUrl: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=80',
        preview: 'Join our community tree planting and botanical tagging drive to make our campus 100% carbon neutral. Eco-badges awarded.',
        body: 'Be part of the green revolution! In collaboration with local forestry authorities, we are planting 1,000 indigenous trees, building rainwater collection gardens, and installing botanical QR tags across campus.\n\nGloves, tools, and eco-friendly seed kits will be provided. All student volunteers receive community service recognition credits.',
        venue: 'Botanical Garden & North Perimeter',
        eventDate: isoDaysFromNow(7, 8),
        postedAt: isoDaysFromNow(-1, 17),
        saved: false,
        scale: 'college',
        featured: false,
        isMyClub: true,
        registrationUrl: 'https://ecoclub.campus.edu/volunteer',
        audience: 'Volunteers and Campus Community',
        content: 'Join the Green Earth 1,000 saplings plantation drive this weekend.'
      }
    ],
    activities: [
      { id: 'act-1', actor: 'user', authorName: 'Priya Patel', avatarInitials: 'PP', avatarBg: 'bg-emerald-600', text: "moved 'Poster design' to Done", occurredAt: isoDaysFromNow(0, 9), eventTag: 'TechNova 2026', undoable: false },
      { id: 'act-2', actor: 'ai', authorName: 'Planova AI', text: "created 9 tasks from 'Core Sync' meeting notes", occurredAt: isoDaysFromNow(-1), eventTag: 'Auto-Tasked', undoable: true },
      { id: 'act-3', actor: 'ai', authorName: 'Planova AI', text: 'raised a risk: permission letter pending for Central Auditorium', occurredAt: isoDaysFromNow(-1), eventTag: 'Risk Detection', undoable: true }
    ],
    budgets: [
      { eventId: 'evt-technova', event: 'TechNova Hackathon 2026', totalPlanned: 12000, committed: 4500, spent: 3200, sponsorshipReceived: 8000, currency: '$' },
      { eventId: 'evt-roboquest', event: 'RoboQuest Championship', totalPlanned: 9000, committed: 3100, spent: 1850, sponsorshipReceived: 5000, currency: '$' },
      { eventId: 'evt-mixer', event: 'Alumni Mentorship Mixer', totalPlanned: 5000, committed: 900, spent: 350, sponsorshipReceived: 2500, currency: '$' },
      { eventId: 'evt-designsprint', event: 'DesignSprint UI Workshop', totalPlanned: 3500, committed: 3500, spent: 3250, sponsorshipReceived: 3500, currency: '$' },
      { eventId: 'evt-technova-2025', event: 'TechNova Hackathon 2025', totalPlanned: 11000, committed: 11850, spent: 11850, sponsorshipReceived: 7500, currency: '$' },
      { eventId: 'evt-roboquest-2025', event: 'RoboQuest 2025', totalPlanned: 8500, committed: 9100, spent: 9100, sponsorshipReceived: 6000, currency: '$' }
    ],
    aiActions: []
  };
}

module.exports = { createSeedData };
