.PHONY: install export serve avatar clean lint format

# Install tool dependencies (Playwright + Chromium)
install:
	cd tools && npm install

# Export all posts + carousel slides → exports/ (2x crisp)
export:
	cd tools && npm run export

# Export at exact 1080×1350 (SCALE=1)
export-1x:
	cd tools && SCALE=1 npm run export

# Export profile avatar
avatar:
	cd tools && npm run export:avatar

# Start static server for in-browser preview + export
serve:
	cd tools && npm run serve

# Remove generated exports
clean:
	rm -rf exports/*.png
	rm -f assets/logo/social/avatar-pf-av-*.png

# Format all Markdown files with Prettier
format:
	npx prettier --write "**/*.md" --prose-wrap preserve

# Check formatting (CI)
format-check:
	npx prettier --check "**/*.md" --prose-wrap preserve

# Open the launch grid in browser (macOS)
open-grid:
	open "http://localhost:8080/design-system/collateral/Eduflick%20Launch%20Grid.html?export=1"

# Full pipeline: install → export → done
all: install export
	@echo "✓ Export complete. Files in exports/"
