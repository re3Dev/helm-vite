# Helm

Helm is an open-source web application for discovering, monitoring, and controlling fleets of 3D printers that run Klipper and expose the Moonraker API. It provides a single interface for interacting with multiple machines at once, removing the need to manage printers individually.

Helm is designed to work out of the box on a local network, requiring no firmware changes, plugins, or per-machine configuration.

<img width="1899" height="1083" alt="image (2)" src="https://github.com/user-attachments/assets/a7c6547b-4279-401f-9377-82a452fde183" />

## Overview

Managing multiple printers often means juggling IP addresses, browser tabs, and machine-specific setups. Helm takes a different approach. When started on a network, it automatically identifies compatible printers and presents them in a unified dashboard.

From there, printers can be monitored live or controlled individually or in groups. Commands can be issued to multiple machines at the same time, making coordinated actions across a fleet fast and repeatable.

Helm scales naturally as printers are added or removed and works equally well for small groups of machines or large production fleets.

## Features

* Automatic discovery of Klipper/Moonraker printers on the local network

* Centralized, browser-based fleet dashboard

* Real-time printer status and monitoring

* Multi-printer command execution

* No required changes to printer firmware or software

* No built-in limits on fleet size

## How It Works

Helm runs as a lightweight web service on the local network. It scans for devices exposing the Moonraker API and builds a live view of available printers. Communication is handled entirely through existing Moonraker endpoints, allowing Helm to operate as a non-intrusive layer on top of current printer setups.

Because printers do not need static IPs or additional software, fleets can be reconfigured or expanded without re-setup.

## Why Helm?

Most fleet management tools require manual onboarding of each machine or installing additional services per printer. Helm removes that friction.

A fleet can be brought online simply by ensuring printers are connected to the same network. From there, Helm handles discovery and coordination automatically. This drastically reduces setup time and makes it practical to manage large or frequently changing fleets.

## Impact on Additive Manufacturing

Helm enables faster scaling of 3D-printing operations by simplifying fleet control and reducing repetitive tasks. Actions that would normally require interacting with dozens of machines individually can be completed in seconds.

Centralized visibility also improves consistency across machines, helping operators better align calibration, configuration, and production workflows in manufacturing environments.

## Technology Stack

* Frontend: Vue 3 + TypeScript

* Build System: Vite

* Styling: Tailwind CSS

* Backend: Flask

This stack keeps Helm fast, responsive, and easy to extend.

## Open Source

Helm is free and open source. There are no licenses, subscriptions, or usage restrictions. The project is intended to be used, modified, and extended by the community.

Contributions, feedback, and experimentation are encouraged.

## Future Plans

Planned enhancements include:

* Cross-platform installers (Windows, macOS, Linux)

* Fleet statistics and historical metrics

* Printer grouping and organization tools

* User permissions and access control

* Remote and cloud-based deployments

## Goals

Helm’s primary goal is to make managing multiple 3D printers simple and reliable. By minimizing required setup and working with existing printer software, Helm focuses on usability, scalability, and real-world production needs.
