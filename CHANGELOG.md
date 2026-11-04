# Changelog

## [v26.11.0] - 2026-11-04

### 🚀 Features
- **Runner Web Dashboard & Tracklog Explorer**: Delivered the web dashboard layout, runner telemetry components, and interactive tracklog explorer architecture for analyzing activity splits and routes (`b0d2459`, `2698d36`, `d929664`).
- **Event Management & Admin Portals**: Implemented tournament and event management modules alongside administrative portals for configuring challenges, categories, and race kits (`d929664`, `5cd3dae`).
- **Core Backend API & Account Services**: Built NestJS API controllers and domain services for athlete accounts, event participation, and activity processing (`84f7e3d`, `481f2e9`, `5cd3dae`, `40f0bd2`, `9cc110f`).
- **Database Schema & Persistence Layer**: Established the PostgreSQL Prisma database schema and package manifest with write-through persistence rules and startup state hydration (`84f7e3d`, `481f2e9`, `5cd3dae`, `40f0bd2`, `9cc110f`).
- **Mobile-Responsive Experience**: Added responsive UI components and touch-friendly navigation tailored for mobile web athletes (`40f0bd2`).
- **Automated Backup & Disaster Recovery**: Added comprehensive database backup and disaster recovery scripts with CLI management support (`ff3298a`).
- **Automated CalVer Release Pipeline**: Introduced an automated CalVer release script integrated with the `agy` CLI changelog generator (`7bcc9e2`).
- **Full-Stack Monorepo & Docker Support**: Initialized the TOPRunAssistant monorepo structure with web, mobile, shared packages, and containerized API Docker support (`9cc110f`, `2a0f68c`, `5809eee`, `e069671`).

### 📝 Documentation & Chores
- **Deployment Guide & Engineering Rules**: Added production deployment documentation, monorepo management scripts, and workspace AI engineering and design system rules (`40f0bd2`, `9cc110f`, `5809eee`).

---

All notable changes to the TOPRunAssistant monorepo are documented in this file.

