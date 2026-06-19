.PHONY: install tokens snippets build check-facts export export-1x export-ig export-posters export-stories export-slides export-pdf avatar serve studio clean lint format format-check open-grid all

# Install tool dependencies (Playwright + Chromium + Style Dictionary)
install:
	cd tools && npm install

# ---- Build (single-source pipeline) ----

# tokens.json → tokens.css + tokens.flat.json + brand.tokens.mjs
tokens:
	cd tools && npm run tokens

# snippets.src.md + tokens → recipes/snippets.md
snippets:
	cd tools && npm run snippets

# Regenerate everything from source (run before committing source changes)
build: tokens snippets

# Facts-integrity guard (retired brand strings)
check-facts:
	cd tools && npm run check:facts

# ---- Export ----

# Export all launch-grid posts + carousel slides → exports/ (2x crisp)
export:
	cd tools && npm run export

# Export at exact 1080×1350 (SCALE=1)
export-1x:
	cd tools && SCALE=1 npm run export

# Instagram tiles / posters / stories → exports/<kit>/
export-ig:
	cd tools && npm run export:ig
export-posters:
	cd tools && npm run export:posters
export-stories:
	cd tools && npm run export:stories

# Program deck slides → exports/full-stack-ai-engineer/
export-slides:
	cd tools && npm run export:slides

# Brochure PDFs → brochures/*.pdf (gitignored)
export-pdf:
	cd tools && npm run export:pdf

# Export profile avatar
avatar:
	cd tools && npm run export:avatar

# Start static server for in-browser preview + export
serve:
	cd tools && npm run serve

# Start the brand studio (galleries, docs, status, guarded editing)
studio:
	cd tools && npm run studio

# Remove generated exports (all regenerable)
clean:
	rm -rf exports/*
	rm -f assets/logo/social/avatar-pf-av-*.png

# Format all Markdown files with Prettier
format:
	npx prettier --write "**/*.md" --prose-wrap preserve

# Check formatting (CI)
format-check:
	npx prettier --check "**/*.md" --prose-wrap preserve

# Open the launch grid in browser (macOS)
open-grid:
	open "http://localhost:8080/design-system/collateral/launch-grid.html?export=1"

# Full pipeline: install → export → done
all: install export
	@echo "✓ Export complete. Files in exports/"
