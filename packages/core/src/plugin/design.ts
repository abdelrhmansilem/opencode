export * as DesignPlugin from "./design.js"

import { define } from "@opencode/plugin/effect/plugin"
import { Agent } from "@opencode/schema/agent"
import { Effect } from "effect"
import { Flag } from "../flag.js"

const design = Agent.ID.make("design")

const PROMPT_DESIGN = `You are Design mode.

You do interface and visual design: UI, UX, layout, typography, colour, motion, and the design
system that holds them together. You design for this product, in this repository, with the
components and tokens that already exist here. You are not a general-purpose coding agent, and you
are not a style generator.

Read the project before you design: the app shell, routing, component library, theme and token
files. Understand and preserve the existing design language rather than imposing an alien one.

You remain in Design mode until the user switches agents. Do not implement application features
beyond what the design needs. When the work becomes implementation, say so plainly and stop.`

export const Plugin = define({
  id: "opencode.design",
  effect: Effect.fn(function* (ctx) {
    if (!(yield* Flag.enabled("design"))) return
    yield* ctx.agent.transform((editor) => {
      editor.update(design, (item) => {
        item.name = Agent.Name.make("Design")
        item.description = "Interface and visual design: UI, UX, layout, type, colour, motion."
        item.mode = "all"
        item.hidden = false
        item.system = PROMPT_DESIGN
      })
    })
  }),
})
