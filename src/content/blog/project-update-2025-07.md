---
title: Brioche Project Update - July 2025
pubDate: 2025-07-31T03:11:48-07:00
author: Kyle Lacy
authorUrl: https://kyle.space
---

## Status report

### Initial exploration of GUI packages

[**@jokeyrhyme**](https://github.com/jokeyrhyme) started [a Zulip discussion related to adding GUI packages in Brioche](https://brioche.zulipchat.com/#narrow/channel/440653-general/topic/ninja.20dependency.20unable.20to.20find.20python.20dependency.3F). That unveiled a bug in the `meson` package ([#838](https://github.com/brioche-dev/brioche-packages/issues/838)) which is still blocking more progress. But in the interim, he was still able to add a new package: [`font_iosevka`](https://github.com/brioche-dev/brioche-packages/pull/843). I see this as an exciting milestone as the first step on the path towards support for GUI packages in Brioche!

The aforementioned `meson` bug is still an annoyance, and there are still a _lot_ of steps until GUI apps are well-supported in Brioche. If you're interested in getting involved, feel free to reach out on Zulip, Discord, or open a GitHub Issue or Discussion!

### Lots of live-update improvements

[**@jaudiger**](https://github.com/jaudiger) has contributed a ton of improvements and fixes in the `brioche-packages` around live-updates in the past month, including suppport for live updates via GitLab, crates.io, NPM, and GitHub tags; more options for automatically matching/sanitizing version numbers; and taking on the work to resolve any issues each week when automatic live-updates fail.

We have a triple-digit number of packages now, and all the improvements to live-updates has been _crucial_ to making sure we're able to stay on top of upstream updates!

### Infrastructure improvements

IRL, [**@asheliahut**](https://github.com/asheliahut) and I were pretty busy this month preparing to host our family over the last week (it went smoothly overall and it was great getting to spend time with them)!

Before the trip, we wanted to clear out the spare bedroom, where we had our our 22U server rack set up. The noise and heat made the room unlivable (we jokingly called it the sauna).

We ended up putting a new 42U server rack in the garage and moved our networking equipment there... plus got a new insulated garage door, an AC minisplit in the garage, a new electric subpanel, etc. It ended up being a big project!

Anyway, I use a mini PC and a Mac mini as GitHub Actions runners for Brioche. We moved those into the garage too, but the new server rack gives a lot more room to grow out to more build machines over time! Basically, we're future-proofed for lots more self-hosted homelab infrastructure for Brioche.

![A 42U server rack in the dark. At the top is a UDM Pro and a USW Pro XG 48 PoE switch surrounded by keystone ports. Then a shelf with miscellanea, a shelf with a Mini PC and Mac mini, and a shelf with a Pi-KVM. Near the bottom is a 12-bay TrueNAS Mini R. The photo is brightly illuminated by blinkenlights from the equipment and a violet-tinted glow from an LED light strip embedded in the edge of the rack.](./project-update-2025-07/server-rack.jpg)

## Housekeeping

### New packages

🎉 This month, we crossed the 200 package milestone! We're at 216 total now! 🎉

Since the last update, there were **32** new packages added:

- `actionlint`
- `binaryen`
- `cargo_binstall`
- `cargo_dist`
- `cargo_hack`
- `cargo_llvm_cov`
- `cargo_minimal_versions`
- `cargo_no_dev_deps`
- `cargo_quickinstall`
- `cargo_sort`
- `cargo_spellcheck`
- `dagger`
- `eigen`
- `font_iosevka`
- `freetype`
- `fribidi`
- `gemini_cli`
- `helix`
- `iperf3`
- `kubectl_view_allocations`
- `libunistring`
- `mpfr`
- `pyrefly`
- `tinycbor`
- `trunk`
- `vacuum`
- `wasm_bindgen_cli`
- `wasm_language_tools`
- `wasm_pack`
- `wasm_server_runner`
- `wasm_tools`
- `wrangler`

### Brioche core updates

- Update Dependabot configuration ([#274](https://github.com/brioche-dev/brioche/pull/274) by [**@jaudiger**](https://github.com/jaudiger))
- Remove unnecessary clone for `Brioche.download` ([#279](https://github.com/brioche-dev/brioche/pull/279) by [**@jaudiger**](https://github.com/jaudiger))
