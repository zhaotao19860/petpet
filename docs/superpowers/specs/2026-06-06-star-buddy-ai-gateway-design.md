# Star Buddy AI Gateway Design

## Goal

Add a child-safe AI companion named `宠宠星宝` to PetPet. Star Buddy should help children care for animals, answer animal questions, tell short animal stories, generate quiz prompts, and guide daily play. The AI layer must work with the user's local Codex setup during development and remain replaceable for Linux/VPS deployment.

## Current State

PetPet is now a multi-user React and Node app. The frontend has pet home, encyclopedia, game space, friends, achievements, real animal images, real sound assets, daily quests, and child-friendly quiz feedback. The backend has Fastify authentication, PostgreSQL persistence through Prisma, user data isolation, pet care APIs, daily quest APIs, achievements, friends, and lightweight cross-user interactions.

The local Codex setup is available on the Mac:

- Codex CLI is installed at `/opt/homebrew/bin/codex`.
- The default Codex model provider is `oneapi`.
- The configured model is `gpt-5.5`.
- The provider uses the Responses wire API.
- The provider base URL is `https://oneapi-comate.baidu-int.com/v1`.
- `codex exec` is available for non-interactive calls.
- `codex mcp-server`, `app-server`, and `exec-server` exist, but the app server is not currently running as a stable always-on app backend.

This means the web app should not call Codex directly from the browser. PetPet should own a small backend AI gateway and make Codex/oneapi one replaceable provider behind that gateway.

## Product Direction

Star Buddy is not a generic chat box. It is a friendly helper that lives inside the animal playground.

Primary jobs:

- Notice current pet needs and suggest one helpful next action.
- Explain animal facts in short child-friendly language.
- Tell short interactive stories about the selected animal.
- Generate quiz cards based on the app's existing animal data.
- Help children choose what to do next: care, learn, play, visit friends, or rest.

The first version should be text-and-button based. Voice, Live2D, and richer character animation are future layers, not first-version dependencies.

## Audience And Safety Principles

The target audience remains ages 3-10.

Rules for Star Buddy:

- Use short sentences, warm tone, and concrete choices.
- Avoid scary, violent, romantic, political, adult, or manipulative content.
- Never shame a child for a wrong answer or missed care action.
- Do not provide veterinary diagnosis, medical treatment, or real-world animal handling instructions beyond safe general reminders.
- For risky situations, say to ask a parent, teacher, or veterinarian.
- Do not encourage touching wildlife, feeding wild animals, chasing animals, disturbing nests, or unsafe close contact.
- Prefer app-grounded animal facts from `animals.ts` over open-ended model knowledge.
- Make it clear that "animal mood translation" is Star Buddy guessing from app state, not real animal language.

## Recommended Approach

Use a PetPet-owned `Star AI Gateway`.

Frontend calls PetPet backend:

- `POST /api/ai/star-buddy/chat`
- `POST /api/ai/star-buddy/care-plan`
- `POST /api/ai/star-buddy/story`
- `POST /api/ai/star-buddy/quiz`

Backend chooses the actual AI provider by environment configuration:

- `AI_PROVIDER=mock`: deterministic child-safe replies for tests and no-AI demos.
- `AI_PROVIDER=codex-cli`: local Mac demo provider using `codex exec`.
- `AI_PROVIDER=oneapi`: direct provider using the configured oneapi-compatible Responses endpoint.
- `AI_PROVIDER=openai-compatible`: generic OpenAI-compatible HTTP provider for Claude proxies, OpenAI-compatible gateways, Ollama/LM Studio adapters, or future home-Mac gateway setups.

The first implementation should include `mock` and one real provider path. For this user's local setup, `codex-cli` is the quickest local path, while `oneapi` is the better long-running deployment path if credentials and network access are available to the server.

## Alternatives Considered

### Direct Frontend AI Calls

The browser calls an AI provider directly.

This is rejected because it would expose credentials, make child-safety enforcement easier to bypass, and couple the UI to one provider.

### Direct Codex App Server Integration

PetPet runs against Codex app-server, exec-server, or remote-control APIs.

This is not recommended for the first version. Those surfaces are useful for Codex tooling and remote development, but they are experimental or operationally heavier than needed for a children's web app.

### PetPet AI Gateway

PetPet backend owns a small provider abstraction and all safety rules.

This is recommended. It keeps the child product stable while allowing Codex CLI, oneapi, OpenAI-compatible gateways, or local model adapters to be swapped later.

## UX Design

Add a `宠宠星宝` entry to the pet home page. It can appear as a small star buddy button near the active animal area and open a compact panel.

Panel modes:

- `帮我照顾`: shows one or two care suggestions based on current pet status.
- `问问星宝`: child can ask an animal question or tap starter prompts.
- `讲个故事`: generates a short story about the active pet.
- `出一道题`: generates one quiz card with choices and a hint.
- `今天玩什么`: recommends one daily action: care, learn, play, friend visit, or reward.

The panel should use large buttons and avoid dense text. Every AI response should include optional quick actions rather than requiring typing.

Example quick actions:

- `去喂食`
- `喝水`
- `去百科`
- `玩小游戏`
- `再讲一个`
- `换个问题`

## Data Flow

Frontend sends only the minimal context needed:

- Requested mode: chat, care-plan, story, or quiz.
- User message when present.
- Active pet id.
- Active animal id.
- Client-selected age band if later added.

Backend resolves trusted context:

- Current authenticated user from session cookie.
- Active pet from the database.
- Animal facts from server-side shared animal data or a generated safe animal context map.
- Daily quest state and achievement summary if needed.

Backend builds a safe prompt and calls the configured provider. Backend then validates the response shape before returning it.

The model should never receive session cookies, passwords, unrelated users' data, or full database rows.

## Response Shapes

Use structured responses internally, even if a provider returns plain text.

Care plan:

```json
{
  "message": "小橘猫有点饿啦，先准备合适的食物吧。",
  "suggestedActions": ["feed", "water"],
  "emotion": "encourage"
}
```

Story:

```json
{
  "title": "橘猫和阳光小窗台",
  "paragraphs": ["短段落一", "短段落二"],
  "choices": [
    { "label": "去找朋友", "prompt": "继续讲它去找朋友的故事" },
    { "label": "准备睡觉", "prompt": "继续讲睡前结尾" }
  ]
}
```

Quiz:

```json
{
  "question": "橘猫休息时最喜欢什么样的地方？",
  "options": ["安静安全的地方", "很吵的马路", "冰冷的水里"],
  "correctIndex": 0,
  "hint": "猫喜欢安全、安静、舒服的地方。"
}
```

Chat:

```json
{
  "message": "猫呼噜常常表示它很放松，但如果它看起来不舒服，要请大人帮忙观察。",
  "quickPrompts": ["再问一个", "讲个猫故事", "出一道猫题"]
}
```

## Backend Components

Add focused backend units:

- `server/src/routes/ai.ts`: authenticated AI endpoints.
- `server/src/ai/starBuddy.ts`: prompt assembly, safety rules, response normalization.
- `server/src/ai/providers/types.ts`: shared provider interface.
- `server/src/ai/providers/mockProvider.ts`: deterministic fallback.
- `server/src/ai/providers/codexCliProvider.ts`: local `codex exec` adapter.
- `server/src/ai/providers/oneApiProvider.ts`: direct HTTP adapter for oneapi/Responses if enabled.
- `server/src/ai/safety.ts`: input length limits, topic guards, output cleanup, child-safe refusal helpers.

Provider interface:

```ts
interface StarAiProvider {
  complete(request: {
    system: string;
    user: string;
    responseSchema: unknown;
    timeoutMs: number;
  }): Promise<string>;
}
```

The first version can use text prompts plus JSON parsing. If the direct provider supports strict structured outputs, it can be added later without changing frontend contracts.

## Codex CLI Provider

The Codex CLI provider is for local Mac demo and home-Mac deployments, not the browser.

Behavior:

- Run `codex exec --skip-git-repo-check --ephemeral --output-last-message <tmp-file>`.
- Pass a single bounded prompt through stdin.
- Use a small timeout, for example 20-30 seconds.
- Disable filesystem/tool expectations in the prompt: Star Buddy should answer only, not edit files or run commands.
- Parse the final message as JSON when possible; otherwise wrap safe plain text as a chat response.

Risks:

- Process startup latency may be too slow for frequent child interactions.
- Codex is an agent tool and may be heavier than a direct model API.
- The provider depends on the Mac's local Codex config and credentials.

Mitigation:

- Cache short care-plan responses for a pet/status snapshot.
- Keep first-version interactions button-driven and patient.
- Prefer `oneapi` or another direct model gateway for production.

## OneAPI/OpenAI-Compatible Provider

The oneapi/openai-compatible provider is the better long-running service path.

Environment:

- `AI_PROVIDER=oneapi` or `AI_PROVIDER=openai-compatible`
- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`
- `AI_TIMEOUT_MS`

This provider should run in the Node server process and call a model endpoint directly. It is suitable for the Linux deployment if credentials are available and the VPS can reach the provider. The VPS does not need to run a model.

## Frontend Components

Add focused frontend units:

- `web/src/components/StarBuddyPanel.tsx`: panel, mode tabs, response rendering.
- `web/src/components/StarBuddyButton.tsx`: small entry button/avatar.
- `web/src/utils/starBuddyApi.ts`: API client wrapper.
- `web/src/models/starBuddy.ts`: response types.

Integrations:

- `HomePage.tsx`: primary entry and care suggestions.
- `StoryLearnPage.tsx`: optional entry for animal Q&A and AI quiz.
- `MiniGameHub.tsx`: optional "星宝出题" entry later.

First version should integrate the home page only and include navigation quick actions to existing pages.

## Memory And Personalization

First version does not need long-term AI memory. It can use current app state:

- Pet name.
- Animal type.
- Growth stage.
- Basic status values.
- Current daily quest state.

Later versions can add `StarBuddyConversation` storage with parental review, but this should not be required for the first safe release.

## Parent Controls

First version should include conservative defaults:

- Limit user message length.
- Limit AI response length.
- No open web browsing.
- No unsupervised file/tool access.
- No cross-user private data in prompts.

Later parent controls can include:

- Disable free text and use quick prompts only.
- Enable/disable AI stories.
- Enable/disable voice.
- Review recent AI conversations.
- Set child age band.

## Error Handling

If AI is disabled or fails:

- Show a friendly fallback: `星宝现在有点忙，我们先照顾小动物吧。`
- Offer local deterministic suggestions based on pet state.
- Keep the app usable without AI.

If provider output is invalid:

- Do not show raw provider output.
- Return a safe fallback response.
- Log only non-sensitive diagnostics.

If the child asks an unsafe or unrelated question:

- Respond briefly and redirect to safe animal learning or ask an adult.

## Testing

Backend tests:

- AI routes require authentication.
- User A cannot request AI context for User B's pet.
- Mock provider returns valid response shapes.
- Unsafe input receives child-safe redirection.
- Provider failure returns friendly fallback.
- Care-plan suggestions map only to allowed care actions.

Frontend checks:

- Star Buddy panel opens and closes on desktop and mobile.
- Each mode has large child-friendly controls.
- Loading and error states are friendly.
- Care suggestions can navigate or trigger existing care flows only through existing app callbacks.
- Text does not overflow on mobile.

Manual verification:

- Ask a normal animal question.
- Ask a risky animal handling question.
- Generate a story for several animal categories.
- Generate a quiz for several animal categories.
- Test with `AI_PROVIDER=mock`.
- Test local Codex provider on the Mac.

## Rollout Plan

Phase 1:

- Add backend AI gateway with `mock` and `codex-cli`.
- Add home-page Star Buddy panel.
- Add care plan, chat, story, and quiz modes.
- Keep all model actions advisory.

Phase 2:

- Add direct oneapi/openai-compatible provider.
- Add AI quiz entry inside encyclopedia.
- Add AI daily task wording.
- Add simple caching and rate limits.

Phase 3:

- Add voice/TTS.
- Add animated Star Buddy avatar.
- Add parent controls and optional conversation history.

Phase 4:

- Add cooperative friend-visit Star Buddy prompts.
- Add richer story theater and branching choices.
- Explore Live2D/VTuber-style presentation inspired by Open-LLM-VTuber, while keeping PetPet's child-safe design.

## Non-Goals For First Version

- Full Live2D integration.
- Voice conversation.
- Long-term memory.
- Autonomous database writes by AI.
- AI web browsing.
- AI access to arbitrary Codex tools.
- Adult companion/persona features from open-source AI pet projects.
- Replacing the existing deterministic animal encyclopedia.

## Decision

Proceed with the PetPet-owned Star AI Gateway. Use `codex-cli` for local demo compatibility with the user's current Codex setup, keep `oneapi/openai-compatible` as the production-ready provider path, and keep all child-safety logic inside the PetPet backend.
