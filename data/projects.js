/* =====================================================================
   data/projects.js — YOUR PORTFOLIO CONTENT
   ---------------------------------------------------------------------
   This is the only file you need to edit to change projects or facts.
   Each { ... } block below is one stop on the track, in riding order.

   Fields:
     id          unique short name, no spaces (used internally)
     title       big heading in the pop-up and over the stop
     subtitle    small line under the title (course code, year ...) — '' to hide
     concept     concept statement, shown as a quote under the title — '' to hide
     x           position along the track, or null to auto-space evenly
     stopImage   the building/landmark drawn in the level (transparent PNG/WebP)
     stopScale   size of that building (1.05 = 105% of the image's pixel size; keep all the same for true-to-life scale)
     description paragraphs of text — use \n\n between paragraphs
     gallery     list of { src, caption } images (prev/next arrows in pop-up)
     links       list of { label, url } buttons (PDF, 3D viewer, video ...)

   To ADD a project: copy a whole { ... }, block, paste it, change the text.
   To REMOVE one: delete its block (including the trailing comma).
   ===================================================================== */

const PROJECTS = [
  {
    id: 'project-1',
    title: 'The Healing Hive',
    subtitle: '',
    concept: 'To heal, grow, learn and flourish together.',
    x: null,
    stopImage: 'assets/stops/project-1-cabins.webp',
    stopScale: 1.05,
    description:
      'To make further use of an empty lot connected to a hospice centre, our design team created a pollinator farm ' +
      'based on bees and native Ontario flower gardens.\n\n' +
      'Apitherapy is a nature-based wellness practice that uses the sound, vibration, and aroma of active beehives.',
    gallery: [
      { src: 'assets/projects/project-1/01-flower-fields.webp',   caption: 'Flower fields' },
      { src: 'assets/projects/project-1/02-bee-hives.webp',       caption: 'Bee hives' },
      { src: 'assets/projects/project-1/03-learning-centre.webp', caption: 'Learning centre' },
      { src: 'assets/projects/project-1/04-honey-shop.webp',      caption: 'Honey shop' },
      { src: 'assets/projects/project-1/05-site-plan.webp',       caption: 'Site plan' },
    ],
    links: [],
  },
  {
    id: 'project-2',
    title: 'Das Koenigs Café',
    subtitle: '',
    concept:
      'From Bertha Benz’s daring 80-kilometre journey, showcasing determination and ingenuity, to the record-shattering ' +
      'speeds of 400 km/h by Koenigsegg, Das Koenigs Café embodies this enduring legacy: a celebration of progress ' +
      'blooming from innovation.',
    x: null,
    stopImage: 'assets/stops/project-2-brick-studio.webp',
    stopScale: 1.05,
    description:
      'This renovation was initiated to create a proper bar and an updated dining room that will further enhance ' +
      'Georgian College’s culinary program while providing a memorable and lasting dining experience for guests.\n\n' +
      'Located within Georgian College, the Georgian Dining Room (GDR) allows Georgian’s internationally trained chefs ' +
      'to highlight their culinary capabilities during dine-in and dinner service.\n\n' +
      'The renovation must invigorate the main floor as the social hub of the College: a place where guests are ' +
      'comfortable meeting, hanging out, or grabbing a bite or a drink. The design welcomes guest interaction in this space.',
    gallery: [
      { src: 'assets/projects/project-2/01-bar.webp',       caption: 'Bar' },
      { src: 'assets/projects/project-2/02-dining.webp',    caption: 'Dining' },
      { src: 'assets/projects/project-2/03-booth.webp',     caption: 'Booth' },
      { src: 'assets/projects/project-2/04-floorplan.webp', caption: 'Floor plan' },
    ],
    links: [],
  },
  {
    id: 'project-3',
    title: 'The Ledger Residence',
    subtitle: '',
    concept:
      'A Passive House design that emphasizes mental relaxation, using organic form and movement to foster a cozy, ' +
      'serene environment with a seamless transition to the outdoors.',
    x: null,
    stopImage: 'assets/stops/project-3-house.webp',
    stopScale: 1.05,
    description:
      'The open-concept layout, combined with organically formed furniture and decor, creates a natural flow of movement ' +
      'throughout the home. Skylights, oversized patio doors, and the residence’s colour scheme provide a serene ' +
      'connection to the outdoors.\n\n' +
      'The Passive House design focuses on energy efficiency and comfort: six-inch rigid insulation, windows oriented for ' +
      'optimal solar gain, airtight construction, and high-performance windows and doors. Luma solar shingles are also ' +
      'incorporated for maximum solar energy. Together these systems maximize solar gain in winter while minimizing it in summer.',
    gallery: [
      { src: 'assets/projects/project-3/01-living-room.webp',  caption: 'Living room' },
      { src: 'assets/projects/project-3/02-kitchen.webp',      caption: 'Kitchen' },
      { src: 'assets/projects/project-3/03-primary-room.webp', caption: 'Primary bedroom' },
      { src: 'assets/projects/project-3/04-floorplan.webp',    caption: 'Floor plan' },
    ],
    links: [],
  },
  {
    id: 'project-4',
    title: 'ModuNest',
    subtitle: '',
    concept: 'To foster creativity through balance and well-being.',
    x: null,
    stopImage: 'assets/stops/project-4-wave-pavilion.webp',
    stopScale: 1.05,
    description:
      'By incorporating Tai Chi into the daily routine, a healthy and relaxed environment is created where ideas can ' +
      'flourish naturally.\n\n' +
      'Like a coral reef breathing life into the ocean, CO₂ is absorbed into the structures, sustaining both creativity ' +
      'and the world around us.',
    gallery: [
      { src: 'assets/projects/project-4/01-co-creation-space.webp', caption: 'Co-creation space' },
      { src: 'assets/projects/project-4/02-tai-chi-room.webp',      caption: 'Tai Chi room' },
      { src: 'assets/projects/project-4/03-meeting-space.webp',     caption: 'Meeting space' },
      { src: 'assets/projects/project-4/04-lunch-room.webp',        caption: 'Lunch room with a view of the 3D printing' },
      { src: 'assets/projects/project-4/05-floorplan.webp',         caption: 'Floor plan' },
    ],
    links: [],
  },
  {
    id: 'project-5',
    title: 'RVH Atrium Renovation',
    subtitle: '',
    concept:
      'Reimagined through immersive ecosystems: Prairies, Tundra, and Ocean. Each environment is designed to regulate ' +
      'the body and mind while creating a natural sense of progression through space. Patients move through these ' +
      'ecosystems as part of a therapeutic, time-pacing strategy.',
    x: null,
    stopImage: 'assets/stops/project-5-hospital.webp',
    stopScale: 1.05,
    description:
      'The Climate Cycle Eco Pods reshape waiting into an embodied, restorative experience rooted in healing. Moving ' +
      'through heat, cold, and rest, the body is gently guided into a rhythm that supports recovery, regulation, and presence.\n\n' +
      'Holographic Canadian animal companions, particularly meaningful for children, offer comfort, learning, and ' +
      'continuity, turning time spent in the hospital into moments of curiosity and care.\n\n' +
      'In an environment where time can feel suspended or overwhelming, the Eco Pods provide structure, purpose, and calm. ' +
      'Whether recovering between appointments, decompressing from long shifts, or accompanying a loved one, people are ' +
      'not simply passing time; they are engaging in a process that supports both body and mind.',
    gallery: [
      { src: 'assets/projects/project-5/01-cafe-bar.webp',        caption: 'Café bar' },
      { src: 'assets/projects/project-5/02-northern-lights.webp', caption: 'Northern Lights' },
      { src: 'assets/projects/project-5/03-cafe-tables.webp',     caption: 'Café tables' },
      { src: 'assets/projects/project-5/04-working-drawings.png', caption: 'Working drawings' },
    ],
    links: [],
  },
];

/* Fun facts — one pops up in the sky each time a coin is collected.
   Add, remove or reorder freely; the game places one coin per fact. */
const FUN_FACTS = [
  'My interest in design and architecture began during my gap year, when I saw all the custom millwork and artwork being shipped through my father’s company.',
  'I did an international internship in Ireland, where I got to learn about office interiors.',
  'My dream project would be designing community centres and schools for remote Indigenous communities in Canada.',
  'I would love the chance to design a movie set and use my skills in the film industry.',
  'I believe design should be inclusive and engaging.',
  'I love to use colour and patterns in my designs.',
  'I took psychology in high school, which led to my interest in how a space impacts a person’s overall well-being.',
  'My first project outside of school was drafting for my grandfather’s folding wall company.',
];

/* The final stop after the checkered flag. */
const POST_OFFICE = {
  title: 'You made it!',
  message: 'Thanks for riding through my portfolio. Would you like to mail me a letter?',
  letterGreeting: 'Dear ' + CONFIG.OWNER_NAME + ',',
  sentMessage: 'Your letter is on its way. I\'ll write back soon!',
};
