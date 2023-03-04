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
};

const getNLUResult = (context: SDSContext) => {
  let nlu_result = context.nluResult.prediction.topIntent;
  return nlu_result;
};

const formatTime = (context: SDSContext) => {
  let u = context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "");
  //matching a regular expression and returning the time.
  regex_match = u.match(/ ([0-9]|1[0-2]) *(o'clock){0, 1}/);
  if (regex_match) {
    return regex_match[1];
  };
  return "some time";
};

const formatDay = (context: SDSContext) => {
  let u = context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "");
  //matching a regular expression and returning the name of the day.
  regex_match = u.match(/ [a-z]*day/);
  if (regex_match) {
    return regex_match[1];
  };
  return "day";
};

const formatTitle = (context: SDSContext) => {
  let u = context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "");
  //matching a regular expression and returning the name of the meeting's name.
  regex_match = u.match(/ an{0, 1} .*/);
  if (regex_match) {
    return regex_match[1];
  };
  return "something";
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
            cond: (context) => getNLUResult(context) === "want_person",
          },
          {
            target: "welcome",
            cond: (context) => getNLUResult(context) === "want_meeting",
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
            cond: (context) => getNLUResult(context) === 'affirm',
            actions: assign({
              title: (context) => formatTitle(`a meeting with ${context.person}`),
            }),
          },
          {
            target: "endline2",
            cond: (context) => getNLUResult(context) === 'reject',
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
            actions: assign({
              title: (context) => formatTitle(context),
            }),
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
            cond: (context) => getNLUResult(context) === "day",
            actions: assign({
              day: (context) => formatDay(context),
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
          entry: say(`Sorry, I didn't get what you mean. On what day?`),
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
            cond: (context) => getNLUResult(context) === "affirm",
          },
          {
            target: "meeting_time",
            cond: (context) => getNLUResult(context) === "reject",
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
            cond: (context) => getNLUResult(context) === "time",
            actions: assign({
              time: (context) => formatTime(context),
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
            cond: (context) => getNLUResult(context) === "affirm",
          },
          {
            target: "welcome",
            cond: (context) => getNLUResult(context) === "reject",
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
            cond: (context) => getNLUResult(context) === "affirm",
          },
          {
            target: "welcome",
            cond: (context) => getNLUResult(context) === "reject",
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