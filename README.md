# Eclipse Bot

Turn your Discord server into a managed AI workspace — structured context, no hallucinations, human-controlled lifecycle.

---

## Why This Exists

If you have used AI agents for any meaningful period of time, you have experienced the degradation problem. You start a conversation, the AI is sharp, follows instructions perfectly, produces exactly what you want. Then you ask it to do something else in the same chat. Then something else. By message 30, it is confused. By message 50, it is hallucinating — referencing things you never said, mixing up tasks, forgetting constraints you set 20 messages ago.

This is not a bug. This is how large language models work. They have a context window — a fixed amount of text they can "see" at any given time. Every message you send pushes older messages further away. The AI does not truly "remember" — it re-reads the visible conversation each time. When the conversation gets long enough, critical instructions fall out of view, and the AI starts filling gaps with plausible-sounding fabrications.

Most teams deal with this by starting new chats manually. But that creates a different problem: scattered context. Your design discussion is in one chat, the follow-up is in another, the final version is in a third, and nobody can find anything. There is no structure, no lifecycle, no way to say "this task started here and ended here."

Eclipse Bot exists to solve both problems at once.

### The Core Insight: Context Isolation + Skill Injection

The fundamental idea is simple but powerful:

**Every AI task gets its own isolated thread, and every thread starts with the right skill context injected automatically.**

When a user clicks "Open" on a writing panel, Eclipse Bot does not just create an empty thread. It creates a thread and immediately posts a structured context message that tells the AI:

- What skill this is (e.g., "deep content writing")
- What type of task the user selected (e.g., "opinion piece")
- What the AI should do (the full skill definition — process, quality criteria, output format)
- What constraints apply

The AI enters the conversation with clear, fresh instructions. It does not need to guess what it should be doing. It does not carry baggage from previous conversations. It reads the injected context, waits for the user's input, and executes the skill.

When the task is done, the user clicks "Archive." The AI processes the output (summarizes, saves files, publishes — whatever the skill defines), and the thread is closed. Clean start, clean end.

This is not a theoretical improvement. We have run this system in production across 4 Discord communities with 80+ active skill panels. The difference in AI output quality between a scoped thread with injected context versus an unstructured chat conversation is dramatic.

### Why Discord?

A reasonable question. Why not build a custom web app? Why not use Slack?

Three reasons:

**1. Teams already live in Discord.** For communities, creative teams, small companies, and especially teams working with AI agents — Discord is already the daily workspace. Building on Discord means zero adoption friction. Users do not need to learn a new tool or switch between apps.

**2. Threads are the perfect AI task container.** Discord threads are naturally isolated, auto-archivable, searchable, and nested under their parent channel. They support rich media (images, files, embeds). They have built-in member management. This is exactly the container an AI task needs — and Discord provides it natively.

**3. The bot ecosystem is mature.** Discord.js is battle-tested, the API is well-documented, and bots can manage channels, permissions, threads, and messages programmatically. Eclipse Bot can create an entire AI workspace — channels, permissions, panels, and all — with a single deployment command.

---

## How It Actually Works

### The Skill Panel System

A Skill Panel is a permanent message (embed + buttons) posted in a Discord channel. Each channel is dedicated to one type of work. The panel provides four buttons:

**Open** — The user clicks this and (if the panel has types defined) selects what kind of task they want to start. Eclipse Bot then:
1. Creates a new thread with a unique ID (e.g., `ASYR-042`)
2. Adds the AI bot and relevant team members to the thread
3. Posts a context message with the full skill definition
4. Posts a welcome message telling the user what to do

The AI bot receives a message like:

```
Task context:
- Skill: content-writing
- Type: Opinion Piece
- Description: Express a strong viewpoint — persuasion + value guidance + disruption

Read the skill docs and prepare for Opinion Piece work.
Wait for user to post their topic.
```

This is why the AI does not hallucinate or get confused. It knows exactly what it is doing before the user even speaks.

**Archive** — When the task is complete, the user returns to the main channel and clicks Archive. Eclipse Bot finds active threads and lets the user select which one to archive. It then sends the skill's archive prompt to the AI, which typically includes:
- Processing the thread's content (summarizing, extracting key outputs)
- Saving files to the workspace
- Publishing results if applicable
- Reporting what was saved and where

The thread is then marked as complete (prefixed with a checkmark) and the AI starts no new work in it.

**History** — Sends a query to the AI asking it to list past completed tasks in this channel. Useful for auditing and finding previous work.

**Clean** — Removes all non-panel messages from the channel, keeping the workspace tidy.

### Why One Channel = One Skill

This is a deliberate architectural decision, not a limitation.

When you put multiple skills in the same channel, the AI sees threads about different topics side by side. Even though each thread is isolated, the channel's visual context bleeds. Users get confused about which channel to use. New team members do not know where to go.

When each channel is dedicated to one skill, the entire channel becomes self-documenting. A user sees `#deep-writing` and knows exactly what happens there. They see threads like `ASYR-001 Article about AI agents` and `ASYR-002 Weekly newsletter` — all clearly scoped to writing.

This also means the deploy-template system works cleanly: each panel maps 1:1 to a channel. Deploy a template and you get exactly the right number of channels with exactly the right panels.

### The Lifecycle Model

The open/archive cycle is what separates this from "just using Discord threads":

```
[Idle] --> User clicks Open --> [Active Thread]
                                     |
                              User works with AI
                              (messages, files, images)
                                     |
                              User clicks Archive --> [Processed & Closed]
                                                           |
                                                    AI saves output
                                                    Thread archived
                                                           |
                                                      [Done] --> searchable, traceable
```

Without this lifecycle:
- Threads pile up with no clear status (is this done? still in progress? abandoned?)
- AI context in old threads becomes stale but never gets cleaned up
- There is no trigger for the AI to process and save its output
- Workspace becomes cluttered and unusable over weeks

With the lifecycle:
- Every task has a clear beginning (Open) and end (Archive)
- The archive step forces the AI to produce a final deliverable
- Closed threads are clearly marked and searchable
- The channel stays clean for new work

This is especially important for teams. When multiple people use the same channel, the lifecycle makes it obvious what is active, what is done, and what needs attention.

---

## The Template System

### Why Templates Exist

Setting up a Discord AI workspace from scratch is tedious. You need to:
1. Create channels with the right names
2. Set permissions (private channels need specific overwrites)
3. Design panel embeds (title, description, color, footer)
4. Define skill types (what options appear in the dropdown)
5. Write archive prompts (what the AI does when archiving)
6. Write history prompts (how the AI queries past work)
7. Configure button labels
8. Post the panels to channels

For one panel, this takes 10-15 minutes. For a 31-panel business setup, it takes hours.

Templates solve this by packaging all of these decisions into a single JSON file. One command reads the template, creates all channels, sets all permissions, generates all panels, and posts them. A 31-panel deployment that would take hours is done in seconds.

### The 6 Templates

These are not hypothetical designs. Each template is extracted from a real production deployment that has been used daily for months. The skill types, archive prompts, and panel configurations have been refined through actual use.

#### 1. Content Creator (4 panels)

For writers, KOLs, content teams, and anyone who produces written content regularly.

**Deep Writing** — A full content creation pipeline. The user selects from 7 content types (social commentary, deep explainer, opinion piece, tutorial, emotional piece, investigative, free topic), and the AI receives the complete writing skill definition including intent analysis, parameter derivation, quality assessment criteria, and publishing workflow. This is not "write me an article" — it is a structured 7-phase writing process that consistently produces high-quality output.

**Social Media Layout** — Converts markdown articles into formatted social media cards (1080x1440px PNG pages). Supports article layout, single-page, illustrated, long-form preview, and branded templates. The AI handles image generation, page splitting, and visual formatting.

**AI Illustration** — Generates article illustrations using a type-by-style matrix. Users choose from infographic, scene, flowchart, comparison, framework, timeline, or smart-mix. The AI analyzes the article content and generates appropriate illustrations.

**Knowledge Archive** — Records conversations, extracts insights, and builds a knowledge base. Four types: client conversations, content discussions, cognitive upgrades, and free notes. The archive process includes raw preservation, quote extraction, person profiling, commentary, and optionally generating long-form articles from deep discussions.

#### 2. Service Agency (6 panels)

For design firms, consulting companies, outsourcing teams, and any service business that manages client work.

**Client Quotes** — Generates professional quotes based on industry templates. 8 industry presets (construction, F&B, manufacturing, e-commerce, education, travel, healthcare, custom) with pre-configured pricing structures, scope definitions, and deliverable lists. The AI knows the industry context and produces quotes that look like they came from an experienced account manager.

**Client Follow-up** — Manages the client follow-up process using diagnostic-based selling (DBS). 6 follow-up types mapped to common client objections: price anxiety, risk fear, unclear value, decision delay, scope drift, and routine check-in. Each type has a specific communication strategy the AI follows.

**Showcase Pages** — Generates landing pages and showcase materials. 10 types including pain-point research, industry foresight, and 8 industry-specific templates. The AI produces complete showcase page designs with copy, layout suggestions, and visual direction.

**Design Workspace** — A general design workbench supporting layout, UI, branding, posters, video, and other design work. The AI assists with design direction, asset generation, and iteration.

**WeChat Publishing** — Manages WeChat Official Account article publishing. Two modes: push article (formatting, scheduling, publishing) and account management.

**Content Cards** — Converts content into visual card formats. 6 types: long-form images, infographics, multi-card sets, visual notes, comics, and whiteboard diagrams.

#### 3. Creative Studio (7 panels)

For art teams, creative communities, and interest groups focused on creative production.

**Announcements** — A structured announcement system with 4 types: important decisions, general announcements, commemorative dates, and open discussions. Keeps community communication organized.

**Art Studio** — AI-powered visual art creation. 3 types: AI image generation, photo editing/retouching, and style transfer. The AI handles prompt engineering, iteration, and output refinement.

**Writing Hall** — Literary creation workspace. 3 types: poetry, prose/essays, and fiction. The AI provides writing assistance, editing, and critique tailored to the literary form.

**Music Room** — Audio production workspace. 2 types: voice synthesis (TTS) and audio production. The AI assists with script preparation, voice selection, and audio post-processing.

**Video Department** — Video production support. 2 types: scriptwriting and post-production editing guidance. The AI helps with story structure, shot planning, and editing notes.

**Theater** — Performance and drama workspace. 3 types: scriptwriting, performance direction, and critical review. Designed for theater groups and performance communities.

**Lecture Hall** — Educational content creation. 3 types: open lectures, seminars/workshops, and reading groups. The AI helps structure educational content, create presentation materials, and facilitate discussion.

#### 4. Full Business (31 panels)

For small and medium enterprises that want to digitize their entire operation. This is the most comprehensive template, covering 6 departments with 31 panels.

All panels use **auto mode** — no predefined types. Users describe what they need in natural language, and the AI infers the appropriate action from the channel context. This works because each channel is narrowly scoped (e.g., "Invoice Management" — the AI knows any request in this channel is about invoices).

**Strategy Department** (3 panels): Brand & Planning, Decision & Data Analysis, Knowledge & Training

**Marketing Department** (6 panels): Copywriting, Social Media (WeChat/Xiaohongshu), Advertising, Customer Profiling, Marketing Documents, Design & Visual

**Sales Department** (4 panels): Client & Enterprise Management, Channel & Sales, Quotes & Contracts, Schedule & Meetings

**Operations Department** (5 panels): Procurement, Production Management, Sampling & Order Tracking, Warehouse & Logistics, Approval & Workflows

**Finance Department** (6 panels): Financial Documents, Invoice Management, Tax & Social Insurance, Bookkeeping, Cost & Profit Analysis, Credentials & Keys

**Admin Department** (7 panels): HR & Personnel Files, Employee KPI, Administrative Documents, Registration & Materials, Contract Management, Company Assets, Legal & IP

This template is designed for companies where the founder or operations manager wants to give their team AI assistance across every function. Each department head gets channels relevant to their work, and the AI adapts to each domain.

#### 5. Knowledge Hub (5 panels)

For research teams, training organizations, and companies building internal knowledge bases.

**Knowledge Ingestion** — Imports knowledge from 5 source types: web pages, YouTube videos, Twitter threads, PDFs, and manual input. The AI extracts, summarizes, and structures the content for the knowledge base.

**Knowledge Forge** — Transforms raw knowledge into structured modules. 5 input types: articles, audio transcripts, video transcripts, books, and free-form. The output is modular, reusable knowledge units.

**Thinking Tools** — A toolkit of 8 cognitive frameworks: roundtable discussion (multi-perspective analysis), writing engine, rank-reduction engine (simplification), concept anatomy, investment analysis, plain-language engine, paper reader, and travel research. Each framework guides the AI through a specific thinking methodology.

**Workspace Tidy** — File system maintenance. 2 modes: full scan (audit everything) and lifecycle cleanup (archive old files, organize recent ones).

**Console** — Panel management interface. 3 types: deploy panels, refresh panels, and panel audit. This is the meta-panel for managing the panel system itself.

#### 6. Lifestyle Community (8 panels)

For interest groups, lifestyle communities, and social spaces.

**Wellness** — Health and wellness guidance. 3 types: wellness plans, dietary therapy, and exercise/practice routines.

**Herbal Medicine** — Traditional medicine workspace. 3 types: prescriptions, herb identification, and consultation.

**Love Letters** — Romantic writing assistance. 2 types: love letters and confessions.

**Moonlit Pavilion** — Reflective space. 2 types: night conversations and meditation guides.

**Wishing Well** — A community wish space. 3 types: wishes, blessings, and gratitude.

**Music Garden** — Music appreciation. 2 types: recommendations and shared listening sessions.

**Chess Room** — Strategy games. 1 type: matches.

**Private Space** — Personal journaling. 2 types: diary and private entries.

### Mixing and Customizing Templates

Templates are not mutually exclusive. You can deploy multiple templates to the same server:

```bash
# Start with content creation
node templates/deploy-template.cjs templates/content-creator.json \
  --guild 123 --bot 456 --brand "My Studio"

# Add knowledge management later
node templates/deploy-template.cjs templates/knowledge-hub.json \
  --guild 123 --bot 456 --brand "My Studio"
```

You can also exclude panels you do not need:

```bash
# Deploy service agency but skip WeChat and cards
node templates/deploy-template.cjs templates/service-agency.json \
  --guild 123 --bot 456 --brand "Agency" \
  --exclude wechat_pub,visual_card
```

And you can create your own templates by copying and modifying the JSON files. The schema is straightforward — each panel is a self-contained configuration block.

---

## How Eclipse Bot Connects to Your AI

This is an important architectural point: **Eclipse Bot does not contain AI logic.** It is purely the UI and workflow management layer. It handles:

- Creating and managing Discord channels and threads
- Posting panel embeds with interactive buttons
- Routing user interactions to the right handler
- Injecting skill context into new threads
- Managing the open/archive lifecycle

The actual AI work is done by a separate bot — your AI bot. When Eclipse Bot creates a thread, it @mentions your AI bot and posts the skill context. Your AI bot reads the context and starts working.

This separation is intentional:

**1. AI-agnostic.** Your AI bot can be anything — an OpenAI assistant, a Claude-based agent, a custom bot built with LangChain, AutoGPT, or any other framework. Eclipse Bot does not care what powers the AI. It just needs something that can read Discord messages and respond.

**2. Independent scaling.** You can upgrade, restart, or replace your AI bot without touching Eclipse Bot. The panel system keeps running regardless of what happens to the AI.

**3. Multiple AI bots.** You can even have different AI bots for different channels. A specialized writing AI for the content channels, a data analysis AI for the business channels, a creative AI for the art channels.

The typical setup looks like:

```
Eclipse Bot (this project)     Your AI Bot (separate project)
         |                              |
   Manages panels               Reads skill context
   Creates threads               Executes tasks
   Handles buttons               Responds in threads
   Injects context               Processes archives
         |                              |
         +--------- Discord -----------+
```

---

## Setup Guide

### Prerequisites

- Node.js 18+ and npm
- A Discord bot token ([create one here](https://discord.com/developers/applications))
- A server (any Linux VPS, or even your local machine for testing)

### Step 1: Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "Bot" tab, click "Add Bot"
4. Copy the bot token (you will need it later)
5. Enable these Privileged Gateway Intents:
   - **Message Content Intent** — Required for reading messages
   - **Server Members Intent** — Required for welcome messages and member tracking
   - **Presence Intent** — Required for status updates
6. Go to "OAuth2" -> "URL Generator"
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: `Administrator` (or manually select: Manage Channels, Manage Messages, Send Messages, Create Public Threads, Send Messages in Threads, Embed Links, Attach Files, Read Message History, Add Reactions, Use Slash Commands)
   - Copy the generated URL and open it in your browser to invite the bot to your server

### Step 2: Clone and Install

```bash
git clone https://github.com/yzha0302/eclipse-bot.git
cd eclipse-bot
npm install
```

### Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
CLIENT_TOKEN="paste-your-bot-token-here"
CLIENT_ID="paste-your-bot-client-id-here"
DATABASE_URL="file:./dev.db"
```

The `CLIENT_ID` is different from the token. You can find it on the "General Information" page of your Discord application. It is also called "Application ID."

### Step 4: Configure Bot Settings

```bash
cp src/bot-config.example.json src/bot-config.json
```

Edit `src/bot-config.json`:
```json
{
  "bot": {
    "id": "paste-your-bot-client-id-here",
    "ownerId": "your-personal-discord-user-id",
    "developers": ["your-personal-discord-user-id"]
  },
  "defaults": {
    "brand": "My Bot",
    "color": 15105570,
    "footer": "My Bot"
  },
  "guilds": {
    "paste-your-guild-id-here": {
      "brand": "My Community",
      "footer": "My Community",
      "color": 10181046,
      "welcome": {
        "enabled": true,
        "channelId": "paste-welcome-channel-id",
        "autoRoleId": "",
        "title": "Welcome!",
        "description": "Welcome to **{guildName}**, {displayName}! You are member #{memberCount}.",
        "thumbnailFromUser": true,
        "color": 5793266
      },
      "levelup": {
        "enabled": true,
        "banner": "levelup_banner.png",
        "color": 16766720,
        "noLeveling": false
      },
      "team": {
        "mention": ["your-user-id"],
        "silent": []
      },
      "ticket": {
        "enabled": false,
        "title": "Support Center",
        "notifyUsers": []
      }
    }
  }
}
```

How to find your Discord IDs: Enable Developer Mode in Discord (Settings -> Advanced -> Developer Mode), then right-click any user, channel, or server and click "Copy ID."

### Step 5: Build and Run

```bash
npm run setup    # Initialize the SQLite database
npm run build    # Compile TypeScript to JavaScript
npm start        # Start the bot
```

You should see: `Logged in as: YourBotName` and `Serving 1 guild(s)`.

For production, use PM2:
```bash
npm install -g pm2
pm2 start dist/index.js --name eclipse-bot
pm2 save
pm2 startup    # Auto-start on server reboot
```

### Step 6: Deploy Skill Panels

Now the bot is running, but it has no panels yet. Deploy a template:

```bash
# Always preview first
node templates/deploy-template.cjs templates/content-creator.json \
  --guild YOUR_GUILD_ID \
  --bot YOUR_BOT_CLIENT_ID \
  --brand "My Studio" \
  --dry-run

# If the preview looks right, deploy
node templates/deploy-template.cjs templates/content-creator.json \
  --guild YOUR_GUILD_ID \
  --bot YOUR_BOT_CLIENT_ID \
  --brand "My Studio"
```

Check your Discord server — you should see new channels with panels posted in them.

---

## Configuration Reference

### bot-config.json

| Key | Type | Description |
|-----|------|-------------|
| `bot.id` | string | Bot's Discord Client ID |
| `bot.ownerId` | string | Your Discord user ID (for owner-only commands) |
| `bot.developers` | string[] | User IDs that can use developer commands |
| `defaults.brand` | string | Default brand name used in embeds |
| `defaults.color` | number | Default embed color (decimal integer) |
| `defaults.footer` | string | Default embed footer text |

### Per-Guild Configuration (guilds.{id})

| Key | Type | Description |
|-----|------|-------------|
| `brand` | string | Guild-specific brand name |
| `footer` | string | Guild-specific footer text |
| `color` | number | Guild-specific embed color |
| `welcome.enabled` | boolean | Enable welcome messages |
| `welcome.channelId` | string | Channel to post welcome messages |
| `welcome.autoRoleId` | string | Role to auto-assign to new members |
| `welcome.title` | string | Welcome embed title |
| `welcome.description` | string | Welcome embed description (supports {displayName}, {username}, {userId}, {memberCount}, {guildName}) |
| `welcome.color` | number | Welcome embed color |
| `levelup.enabled` | boolean | Enable leveling system |
| `levelup.banner` | string | Filename of level-up banner image (in assets/) |
| `levelup.color` | number | Level-up embed color |
| `levelup.noLeveling` | boolean | Completely disable XP for this guild |
| `team.mention` | string[] | User IDs to @mention in new skill threads |
| `team.silent` | string[] | User IDs to add to threads without @mention |
| `team.familyRoleId` | string | Role ID whose members get silently added to threads |
| `ticket.enabled` | boolean | Enable ticket system |
| `ticket.title` | string | Ticket panel title |
| `ticket.notifyUsers` | string[] | User IDs to notify on new tickets |

### .env

| Variable | Description |
|----------|-------------|
| `CLIENT_TOKEN` | Discord bot token (from Developer Portal) |
| `CLIENT_ID` | Discord bot client/application ID |
| `DATABASE_URL` | Database connection string (default: `file:./dev.db` for SQLite) |

---

## Built-in Community Features

Eclipse Bot is not just an AI workflow manager. It includes a full community toolkit:

### Leveling System

Based on the Mee6 XP formula: `XP = 5x^2 + 50x + 100` where x is the current level. Users earn 15-25 XP per message (with anti-spam protection). Features include:

- Rank cards with customizable backgrounds
- Role rewards at specific levels (configurable per guild)
- Leaderboard command
- XP rate multiplier per guild
- No-XP channels and roles
- Top-ranked member gets a special role

### Economy System

A cross-server currency system with two tiers:

- **Gold** — Premium currency (1:1 USD value), managed by admins
- **Silver** — Earned through chatting (0.5 per message) and daily check-in, plus level-up bonuses

Commands: `/wallet`, `/daily`, `/transfer`, `/transactions`

### Ticket System

Multi-category support tickets with subcategories:

- Users click a button to open a ticket
- Select category and subcategory
- A private thread is created with the support team
- Configurable notification list per guild

### Welcome System

Fully configurable per-guild welcome messages:

- Custom embed with variable substitution ({displayName}, {memberCount}, etc.)
- Auto-role assignment on join
- Custom welcome channel per guild
- User avatar as thumbnail

---

## Project Structure

```
eclipse-bot/
├── src/
│   ├── index.ts                    # Entry point
│   ├── config.ts                   # Config loader (reads bot-config.json)
│   ├── bot-config.json             # Your configuration (gitignored)
│   ├── bot-config.example.json     # Configuration template
│   ├── skill-panels.json           # Active panel configs (managed by deploy script)
│   ├── class/
│   │   ├── Builders.ts             # Command and event builder classes
│   │   ├── ExtendedClient.ts       # Discord client with Prisma and command collections
│   │   └── canvas/                 # Rank card image generation
│   ├── handlers/
│   │   ├── skillPanelHandler.ts    # Core: panel button routing and thread creation
│   │   ├── ticketSystem.ts         # Support ticket management
│   │   └── ticketCounter.ts        # Auto-incrementing ticket IDs
│   ├── events/
│   │   ├── Client/ready.ts         # Bot startup and rank updates
│   │   └── Guild/
│   │       ├── interactionCreate.ts  # All interaction routing
│   │       ├── messageCreate.ts      # Leveling, XP, silver rewards
│   │       └── guildMemberAdd.ts     # Welcome messages
│   ├── commands/
│   │   ├── Economy/                # wallet, daily, transfer, transactions, admin
│   │   ├── Levels/                 # rank, leaderboard, info, no-xp
│   │   ├── Owner/                  # configuration, admin-panel, give/remove xp
│   │   ├── Ticket/                 # ticket panel, ticket management
│   │   └── Utility/               # ping, help
│   ├── utils/
│   │   ├── botConfig.ts            # Configuration reader with defaults
│   │   ├── threadCounter.ts        # Thread ID generation (PREFIX-001, PREFIX-002)
│   │   └── sendComponents.ts       # Discord component helpers
│   └── util/
│       ├── functions.ts            # XP calculation, formatting
│       └── classes.ts              # Rank card generation
├── templates/
│   ├── content-creator.json        # 4 panels for content teams
│   ├── service-agency.json         # 6 panels for service companies
│   ├── creative-studio.json        # 7 panels for creative groups
│   ├── full-business.json          # 31 panels for full company digitization
│   ├── knowledge-hub.json          # 5 panels for research/training teams
│   ├── lifestyle-community.json    # 8 panels for interest communities
│   ├── deploy-template.cjs         # One-command template deployment script
│   └── README.md                   # Template system documentation
├── scripts/
│   └── send-panel.cjs              # Panel embed posting utility
├── prisma/
│   └── schema.prisma               # Database schema (User, Guild, Wallet, etc.)
├── data/
│   └── thread-counters.json        # Runtime thread ID counters
├── assets/                         # Banner images for rank cards and level-ups
├── .env.example                    # Environment variable template
├── .gitignore
├── package.json
├── tsconfig.json
└── LICENSE                         # MIT
```

---

## Origin

Eclipse Bot is not a weekend project or a proof of concept. It is extracted from a production system that has been running daily across 4 Discord communities with 80+ active skill panels.

The skill panel architecture, the template configurations, and the open/archive lifecycle have been refined through thousands of real AI task executions. The 6 templates contain actual production configurations — the types, prompts, and workflows have been iterated based on real user feedback and real AI output quality.

The decision to open-source came from seeing how many teams struggle with the same AI context management problem. The solution is not more powerful AI — it is better structure around how humans interact with AI. Eclipse Bot provides that structure.

---

## License

MIT — use it however you want.
