# Changelog

## [0.4.0](https://github.com/Rin0o/Lunario_Weather_and_Earth/compare/v0.3.0...v0.4.0) (2026-11-17)


### Features

* **crops:** botanical engravings for every crop (RF-06) ([7fe079a](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/7fe079afcf9649cadc765d4f58e25187f8ab14b2))
* **nav:** a back button that returns to the previous screen ([0944cf1](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/0944cf16bc5bebebd9ac2c87984177c75af0cefd))
* **ui:** compact garden cards, and Alerts and Settings screens ([c69d17b](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/c69d17bf9091f3da7636fce4ae08dd6f5d00cc97))
* **ui:** notebook look, bottom tab bar and a Sky page ([f55f67f](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/f55f67fcd849441229281116fee23a5c29fe9e50))


### Bug Fixes

* **i18n:** "Adicionar à horta" instead of "Registar plantio" ([daa24e6](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/daa24e685fa16c17e6b740f152bd5bb1a809918b))

## [0.3.0](https://github.com/Rin0o/Lunario_Weather_and_Earth/compare/v0.2.0...v0.3.0) (2026-11-16)


### Features

* **almanac:** show the saint of the day and a saying on Hoje (RF-08) ([6b4b8b5](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/6b4b8b5b9d83e40ee6448653c47d865dbf9cf9d7))
* **calendar:** subscribe to the zone's fortnightly calendar (RF-12) ([189e513](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/189e513a680e5a0268ee25a5496a1ed12b62c29b))
* **catalog:** validate /data and build catalog.json with derived zones and harvests ([88f0595](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/88f05957c260e17bd0863d635571e447e2459a82))
* **crops:** add crop sheets with each crop's calendar for the user's zone (RF-06) ([95882cb](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/95882cbb16d5af8f17ceb2e439f4b2dd4c98395b))
* **data:** add days from nursery sowing to transplant for the 18 crops sown in trays ([2b379d6](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/2b379d6c0fe654bf60a6d295e3cacfb2ccc59fb4))
* **data:** add the saints of the day and traditional sayings (RF-08) ([223f194](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/223f1943c0ce4f8829b8ba7d2773db2ad84fdc95))
* **data:** add the sowing calendar as bilingual CSV files in /data (D-25) ([4848140](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/48481408de66b057947572e95be4d9307858bb85))
* **data:** make the lunar rules machine-readable with periods and advice ([75a277d](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/75a277d62e5b11f1d5c0bb7c8d66f70d2dc2d918))
* **data:** mark the crops that frost damages ([11d0059](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/11d00590eb693709ba49a4606d54b9fb940c6ab0))
* **frost:** find the frost risk over a span of hours ([c1a0e87](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/c1a0e87935a1c4b74854864179162adcce588914))
* **frost:** send a test frost alert from the app ([c590eb9](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/c590eb9a22aaa47fff5379ab4849a274ed76af5b))
* **frost:** turn on frost alerts on the phone with Web Push (RF-14) ([3a1c5a0](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/3a1c5a0a89a0c675ab01ea98e5d5dd2e4d6264cc))
* **frost:** warn of frost on opening the app (RF-16) ([6ba7132](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/6ba71320eac8be982796cf2c17fa5aa1d477f8ea))
* **garden:** add 'A minha horta' to log plantings and follow them to harvest ([768a48c](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/768a48c97f92fd8fd5b55d29f5a9832e36b61065))
* **garden:** add calendar reminders for transplant and harvest (RF-13) ([c0af9d9](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/c0af9d9bb43528eb60b3762cdef145f539802b93))
* **garden:** back up the garden to a file and remind monthly (RF-11, RF-15) ([9965a7b](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/9965a7bdde6b2eb8501f4622d3bd81ba1a2c461b))
* **garden:** store plantings on the device with IndexedDB (RF-10) ([5c3df71](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/5c3df7199b5951c271d0dcd14c6ea248342351b9))
* **holidays:** compute Portuguese national holidays on the device (RF-07) ([29b0c91](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/29b0c915faca7f08f080056910a66f7a2cc4c734))
* **location:** find the user's place by GPS or from IPMA's mainland list (RF-04) ([7d80881](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/7d8088187bb818827b264c26a2e282c13afb0d79))
* **moon:** add the optional Moon mode with lunar tradition (RF-09) ([e45be4e](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/e45be4e63991c288ab8fc500597e51597a8d105b))
* **today:** show the weather and a location picker on the Today screen ([4ff5732](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/4ff57320088e56c415988da9581f30997d70ca94))
* **today:** show today's holiday and the next three on the Today screen ([863d56f](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/863d56fd61bea94d2d1d812a76965e842af6cac5))
* **today:** show what to sow, plant and harvest this fortnight (RF-05) ([f900133](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/f90013366e3cc48d51add4b2f31619f0ecd335f8))
* **weather:** fetch and cache the IPMA daily forecast (RF-03) ([1efb070](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/1efb07022217dd58c84ca845c45eb262dc89e2cb))
* **worker:** send frost alerts by Web Push for each user's location (RF-14, RF-17) ([cdcb8fa](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/cdcb8fa65719db3856a28d9da4ab722b1b78c2bf))


### Bug Fixes

* **ci:** pin wrangler in the lockfile so the deploy can install it ([dba9e33](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/dba9e33161d6e977051d36c0d27709636974fd6b))
* **data:** correct the incoherent derived windows with manual ones (Q-10) ([f036d1a](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/f036d1a7f4eb8f1f86c1a70f8a13373c13df2d08))
* **garden:** keep reminder edits made before the saved settings load ([e72822b](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/e72822b5cc2f5483a32bf408d457eb96388479e9))
* **worker:** keep push messages small enough for Firefox for Android ([5dadb23](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/5dadb235b291afebc257016a309457910e76cd16))
* **worker:** report why a push service refused a notification ([d8e943b](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/d8e943beff4cb2a6b7d65384c4bbdd2d618ee478))

## [0.2.0](https://github.com/Rin0o/Lunario_Weather_and_Earth/compare/v0.1.0...v0.2.0) (2026-11-15)


### Features

* **astro:** compute moon phases and sun and moon rise/set times on the device (RF-02) ([23077a3](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/23077a3c0fba7545bc14c142998a124d8672c410))
* **today:** show the moon and sun on the Today screen ([41cc616](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/41cc6165f4d4b2e90c07b1359b1315605c84d394))

## 0.1.0 (2026-11-15)


### Features

* add a calendar test page for the family's phones (Q-09) ([8052744](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/8052744279744d4ca59f405251cd253e4b5a8c95))
* **calendar:** add an iCalendar writer for all-day reminder events ([4d3ffc1](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/4d3ffc1836e03bd2f0cf059fb4d7e5f3bc4dfd0a))


### Bug Fixes

* serve the web manifest and calendar feed with explicit content types ([91e9a39](https://github.com/Rin0o/Lunario_Weather_and_Earth/commit/91e9a39b639d5ebd03ab9aa07ae7e73b3bd2b78d))
