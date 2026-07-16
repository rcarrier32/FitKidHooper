# Fit Kid Hooper Development Workflow

## Purpose

This document defines how Fit Kid Hooper is developed. It is the source of truth for AI collaboration and engineering workflow.

## Team Roles

### Founder

Owns:

- Final product decisions
- Vision
- Prioritization
- User validation

### ChatGPT

Owns:

- Product strategy
- Sprint planning
- Product reviews
- Commercialization
- Feature prioritization

ChatGPT does not implement code.

### Claude

Owns:

- UX implementation
- Product-aware coding
- Playwright testing
- Architecture validation
- Product verification

Claude always verifies the current implementation before coding.

### Cursor

Owns:

- Refactoring
- Engineering quality
- Performance
- Technical debt
- Cleanup
- Architecture consistency
- Build verification

Cursor improves existing systems rather than inventing new ones.

## Area Ownership

Before every sprint, claim the area being modified. Areas include:

- Home
- Practice
- Progress
- Coach
- Settings
- Admin
- Analytics
- Authentication
- Onboarding

Only one AI may own an area at a time.

Exceptions require one of the following:

- Founder-approved overlap
- An emergency bug fix
- A shared infrastructure change

If another active sprint owns the area:

1. Stop.
2. Report the conflict.
3. Recommend a merge or sequencing strategy.
4. Do not continue until ownership is clarified.

## Sprint Workflow

Every sprint follows this process:

1. Define the product goal.
2. Claim the affected area.
3. Verify the existing implementation. Never assume something needs to be built.
4. Clarify product decisions before coding.
5. Build by extending existing systems where possible.
6. Verify in the browser.
7. Run regression verification.
8. Verify analytics when applicable.
9. Complete a product review.
10. Commit the finished work.

## Definition of Done

A sprint is complete only when:

- The application builds successfully.
- The changed experience is browser tested.
- No regressions are found.
- Existing functionality is preserved.
- Playwright passes.
- Analytics still function when applicable.
- The product goal is achieved.

## Product Rules

- Never build duplicate systems.
- Prefer extending existing functionality.
- Presentation may change; underlying systems should not be duplicated.
- Preserve working behavior unless the sprint explicitly changes it.

Every new feature must answer:

- Why does this improve the athlete experience?
- Can an existing system solve this?
- Does this simplify the product?

## Documentation Rules

- Do not create duplicate documentation.
- Merge decisions into an existing document whenever appropriate.
- Document only durable decisions and contracts.
- Do not document temporary implementation details.

## Technical Debt

Technical debt should be:

- Reported
- Prioritized
- Estimated

Do not automatically fix unrelated technical debt during feature work.

## Verification Rule

Verify every assumption against the current:

- Code
- Database
- UI

Previous conversations are context, not evidence. Never rely on them as the sole source of truth.

## AI Collaboration Rule

If another AI is actively modifying the same files or feature area:

1. Stop.
2. Report the overlap.
3. Recommend a merge or sequencing strategy instead of creating a competing implementation.

Resume only after ownership is clear.
