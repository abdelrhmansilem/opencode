import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Agent } from "@opencode/core/agent"
import { Bus } from "@opencode/core/bus"
import { AppNodeBuilder } from "@opencode/core/effect/app-node-builder"
import { Flag } from "@opencode/core/flag"
import { Location } from "@opencode/core/location"
import { DesignPlugin } from "@opencode/core/plugin/design"
import { AbsolutePath } from "@opencode/core/schema"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Global } from "@opencode/util/global"
import { location } from "./fixture/location"
import { testEffect } from "./lib/effect"
import { agentHost, host } from "./plugin/host"

const testLocation = location({ directory: AbsolutePath.make("/project") })
const locationLayer = Layer.succeed(Location.Service, Location.Service.of(testLocation))
const global = Global.make({ data: "/data", config: "/config", tmp: "/tmp/opencode" })
const globalLayer = Layer.succeed(Global.Service, Global.Service.of(global))

const it = testEffect(
  AppNodeBuilder.build(LayerNode.group([Agent.node, Bus.node, Location.node]), [
    Global.node.replace(globalLayer),
    Location.node.replace(locationLayer),
  ]) as unknown as Layer.Layer<unknown, never>,
)

const design = Agent.ID.make("design")

/** Runs the plugin the way a Location does: resolve its own flag, then update the shared agent registry. */
const activate = (options: { readonly channel?: string; readonly overrides?: string } = {}) =>
  Effect.gen(function* () {
    const agent = yield* Agent.Service
    yield* DesignPlugin.Plugin.effect(host({ agent: agentHost(agent) })).pipe(
      Effect.provide(
        Flag.testLayer([], { app: { channel: options.channel ?? "dev" }, overrides: options.overrides }),
      ),
    )
    return agent
  })

describe("Design agent", () => {
  it.effect("registers a mode that is both selectable and delegable", () =>
    Effect.gen(function* () {
      const agent = yield* activate()
      const info = yield* agent.get(design)

      expect(info).toMatchObject({ id: design, name: "Design", mode: "all", hidden: false })
      expect(info?.description).toBe("Interface and visual design: UI, UX, layout, type, colour, motion.")
      expect(info?.system?.length).toBeGreaterThan(0)
    }),
  )

  it.effect("keeps Build's tools and permissions", () =>
    Effect.gen(function* () {
      const agent = yield* activate()
      const info = yield* agent.get(design)

      expect(info?.permissions).toEqual(Agent.Info.default(design).permissions)
    }),
  )

  it.effect("stays out of the registry when the flag is off", () =>
    Effect.gen(function* () {
      const agent = yield* activate({ channel: "latest" })

      expect(yield* agent.get(design)).toBeUndefined()
    }),
  )

  it.effect("turns on explicitly in a released build", () =>
    Effect.gen(function* () {
      const agent = yield* activate({ channel: "latest", overrides: "design" })
      const info = yield* agent.get(design)

      expect(info?.mode).toBe("all")
    }),
  )
})