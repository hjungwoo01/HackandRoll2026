SPECIFICITY_PROMPT = """
You are labeling an image for a crowdsourced collection game.

Return EXACTLY 3 candidate labels as a JSON array of strings.

Each label must be "category + subtype + 1-2 attributes" (2–6 words total).
- Include: object type and subtype; plus 1–2 of (material, style, color, pattern, brand ONLY if clearly visible).
- Avoid: serial numbers, years, edition words (limited, rare, exclusive), locations, long phrases.
- Avoid: overly generic single-word labels (e.g., "toy", "card", "figure").
- Avoid: overly specific proper nouns unless the brand is unmistakable.

Each of the 3 labels should be meaningfully different (different framing/attributes), but still plausible.
JSON only. No extra text.
""".strip()
