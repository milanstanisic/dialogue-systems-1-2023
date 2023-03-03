import { MachineConfig, send, Action, assign } from "xstate";

function say(text: string): Action<SDSContext, SDSEvent> {
  return send((_context: SDSContext) => ({ type: "SPEAK", value: text }));
}

interface Grammar {
  [index: string]: {
    intent: string;
    entities: {
      [index: string]: string;
    };
  };
}

const grammar: Grammar = {
  lecture: {
    intent: "None",
    entities: { title: "dialogue systems lecture" },
  },
  lunch: {
    intent: "None",
    entities: { title: "lunch at the canteen" },
  },
  doctor: {
    intent: "None",
    entities: { title: "doctor's appointment" },
  },
  sport: {
    intent: "None",
    entities: { title: "sport time" },
  },
  dinner: {
    intent: "None",
    entities: { title: "dinner out"},
  },
  exam: {
    intent: "None",
    entities: { title: "Exam" },
  },
  workout: {
    intent: "None",
    entities: { title: "Workout at the gym" },
  },
  date: {
    intent: "None",
    entities: { title: "Date" },
  },
  flight: {
    intent: "None",
    entities: { title: "Plane flight" },
  },
  dentist: {
    intent: "None",
    entities: { title: "Dentist appointment" },
  },
  "on friday": {
    intent: "None",
    entities: { day: "Friday" },
  },
  "on saturday": {
    intent: "None",
    entities: { day: "Saturday" },
  },
  "on sunday": {
    intent: "None",
    entities: { day: "Sunday" },
  },
  "on monday": {
    intent: "None",
    entities: { day: "Monday" },
  },
  "on tuesday": {
    intent: "None",
    entities: { day: "Tuesday" },
  },
  "on wednesday": {
    intent: "None",
    entities: { day: "Wednesday" },
  },
  "on thursday": {
    intent: "None",
    entities: { day: "Thursday" },
  },
  "at 10": {
    intent: "None",
    entities: { time: "10:00" },
  },
  "at 11": {
    intent: "None",
    entities: { time: "11:00" },
  },
  "at 12": {
    intent: "None",
    entities: { time: "12:00" },
  },
  "at noon": {
    intent: "None",
    entities: { time: "12:00" },
  },
  "at midnight": {
    intent: "None",
    entities: { time: "00:00" },
  },
  "at 1": {
    intent: "None",
    entities: { time: "01:00" },
  },
  "at 2": {
    intent: "None",
    entities: { time: "02:00" },
  },
  "at 3": {
    intent: "None",
    entities: { time: "03:00" },
  },
  "at 4": {
    intent: "None",
    entities: { time: "04:00" },
  },
  "at 5": {
    intent: "None",
    entities: { time: "05:00" },
  },
  "at 6": {
    intent: "None",
    entities: { time: "06:00" },
  },
  "at 7": {
    intent: "None",
    entities: { time: "07:00" },
  },
  "at 8": {
    intent: "None",
    entities: { time: "08:00" },
  },
  "at 9": {
    intent: "None",
    entities: { time: "09:00" },
  },
  yes: {
    intent: "None",
    entities: { affirm: "yes" },
  },
  yeah: {
    intent: "None",
    entities: { affirm: "yeah" },
  },
  sure: {
    intent: "None",
    entities: { affirm: "sure" },
  },
  correct: {
    intent: "None",
    entities: { affirm: "correct" },
  },
  no: {
    intent: "None",
    entities: { reject: "no" },
  },
  incorrect: {
    intent: "None",
    entities: { reject: "incorrect" },
  },
  absolutely: {
    intent: "None",
    entities: { affirm: "absolutely" },
  },
  not: {
    intent: "None",
    entities: { affirm: "not" },
  },
  "schedule something": {
    intent: "None",
    entities: { want_meeting: "something"},
  },
  "create a meeting": {
    intent: "None",
    entities: { want_meeting: "meeting"},
  },
  "make an appointment": {
    intent: "None",
    entities: { want_meeting: "appointment"},
  },
  "find out who somebody is": {
    intent: "None",
    entities: { want_person: "get to know"},
  },
  "who": {
    intent: "None",
    entities: { want_person: "who is x"},
  },
  "meeting with a person": {
    intent: "None",
    entities: { title: "meeting with somebody"},
  },
};

const getEntity = (context: SDSContext, entity: string) => {
  // lowercase the utterance and remove tailing "."
  let u = context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "");
  if (u in grammar) {
    if (entity in grammar[u].entities) {
      return grammar[u].entities[entity];
    }
  }
  return false;
};

const isWho = (context: SDSContext) => {
  let u = context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "");
  return u.includes("who is");
};

const getName = (context: SDSContext) => {
  let u = context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "");
  return u.replace("who is", "");
};


export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = {
  initial: "idle",
  states: {
    idle: {
      on: {
        CLICK: "init",
      },
    },
    init: {
      on: {
        TTS_READY: "menu",
        CLICK: "menu",
      },
    },
    menu: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "whois",
            cond: (context) => !!getEntity(context, "want_person"),
            actions: assign({
              want_person: (context) => getEntity(context, "want_person"),
            }),
          },
          {
            target: "welcome",
            cond: (context) => !!getEntity(context, "want_meeting"),
            actions: assign({
              want_meeting: (context) => getEntity(context, "want_meeting"),
            }),
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say(`Hello! Do you want to find out who somebody is or do you want to schedule something?`),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(`Sorry, I don't think I'm able to do that. Please try again.`),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    whois: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "whotheyare",
            cond: (context) => isWho(context),
            actions: assign({
              person: (context) => getName(context),
            }),
            },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say(`Who do you want to find out about?`),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(`Sorry, I don't know them. Please try again.`),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    whotheyare: {
      initial: "loading",
      states: {
        loading: {
          invoke: {
            id: 'Abstract',
            src: (context, event) => kbRequest(context.person),
          onDone: {
              target: 'success',
              actions: assign({
                personinfo: (context, event) => {return event.data.Abstract;},
              }), 
            },
            onError: {
              target: 'failure',
            },
          },
        },
        success: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `Here is what I know about ${context.person}: ${context.personinfo}`,
            })),
          type: 'final',
        },
        failure: {
          entry: say(`Sorry, I can't find anything about them. I'll try searching some resources again.`),
	    on: {ENDSPEECH: "loading"}
        },
      },
      onDone: "wannameetthem",
    },
    wannameetthem: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "day_of_the_week",
            cond: (context) => !!getEntity(context, "affirm"),
            actions: assign({
              affirm: (context) => getEntity(context, "affirm"),
            }),
          },
          {
            target: "endline2",
            cond: (context) => !!getEntity(context, "reject"),
            actions: assign({
              reject: (context) => getEntity(context, "reject"),
            }),
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say(`Do you want to set up a meeting with them?`),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(`Sorry, I didn't get that. Please try again.`),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    welcome: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "info",
            cond: (context) => !!getEntity(context, "title"),
            actions: assign({
              title: (context) => getEntity(context, "title"),
            }),
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say(`What do you want to schedule?`),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(`Sorry, I didn't get what you mean. Please try again.`),
          on: { ENDSPEECH: "ask" },
        }
      },
    },
    info: {
      entry: send((context) => ({
        type: "SPEAK", 
        value: `Ok, let's schedule ${context.title}!`, })),
      on: { ENDSPEECH: "day_of_the_week" },
    },
    day_of_the_week: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "duration",
            cond: (context) => !!getEntity(context, "day"),
            actions: assign({
              day: (context) => getEntity(context, "day"),
            }),
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say(`What day of the week do you want the meeting on?`),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(`Sorry, I didn't get what you mean. Please try again.`),
          on: { ENDSPEECH: "ask" },
        }
      },
    },
    duration: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "confirmation_whole_day",
            cond: (context) => !!getEntity(context, "affirm"),
            actions: assign({
              affirm: (context) => getEntity(context, "affirm"),
            }),
          },
          {
            target: "meeting_time",
            cond: (context) => !!getEntity(context, "reject"),
            actions: assign({
              reject: (context) => getEntity(context, "reject"),
            }),
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say(`Do you want your meeting to be scheduled for the whole day?`),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(`Sorry, I didn't get what you mean. Please try again.`),
          on: { ENDSPEECH: "ask" },
        }
      },
    },
    meeting_time: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "confirmation_time",
            cond: (context) => !!getEntity(context, "time"),
            actions: assign({
              time: (context) => getEntity(context, "time"),
            }),
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say(`What time shall the meeting be?`),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(`Sorry, I didn't get what you mean. Please try again.`),
          on: { ENDSPEECH: "ask" },
        }
      },
    },
    confirmation_whole_day: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "endline",
            cond: (context) => !!getEntity(context, "affirm"),
            actions: assign({
               affirm: (context) => getEntity(context, "affirm"),
            }),
          },
          {
            target: "welcome",
            cond: (context) => !!getEntity(context, "reject"),
            actions: assign({
              reject: (context) => getEntity(context, "reject"),
            }),
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `Okay, I scheduled ${context.title} on ${context.day}. Is that correct? If not, we will try scheduling your meeting once again.`,
            })),
          on: { ENDSPEECH: "ask" },
        },
       ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(`Sorry, I didn't get what you mean. Please try again.`),
          on: { ENDSPEECH: "ask" },
        }
      },
    },
    confirmation_time: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "endline",
            cond: (context) => !!getEntity(context, "affirm"),
            actions: assign({
              affirm: (context) => getEntity(context, "affirm"),
            }),
          },
          {
            target: "welcome",
            cond: (context) => !!getEntity(context, "reject"),
            actions: assign({
              reject: (context) => getEntity(context, "reject"),
            }),
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `Okay, I scheduled a(n) ${context.title} on ${context.day} at ${context.time}. Is that correct? If not, we will try scheduling your meeting once again.`,
            })),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(`Sorry, I didn't get what you mean. Please try again.`),
          on: { ENDSPEECH: "ask" },
        }
      },
    },
    endline: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `Your meeting has been created!`,
        })),
    },
    endline2: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `Goodbye then!`,
        })),
    },
  },
};

const kbRequest = (text: string) =>
  fetch(
    new Request(
      `https://cors.eu.org/https://api.duckduckgo.com/?q=${text}&format=json&skip_disambig=1`
    )
  ).then((data) => data.json());