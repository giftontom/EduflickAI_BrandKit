/* ============================================================================
   pdf-export.js — client-side, multi-page HTML → downloadable PDF.
   Brand-neutral. Lifted and generalized from a production brochure exporter.

   Requires html2canvas + jsPDF loaded globally first (UMD builds):
     <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
     <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

   Each "sheet" element becomes one PDF page. Usage:
     PdfExport.attachButton('#downloadPdfBtn', { sheetSelector: '.sheet', filename: 'doc.pdf' });
   or call PdfExport.download(opts) directly.

   CRITICAL for a clean export (see reference.md):
   - All images/backgrounds must be INLINE base64 data URIs, or the canvas taints and fails.
   - Avoid SVG *filter* backgrounds (html2canvas renders them blank — we strip CSS filter on SVGs).
   - Web fonts must be loaded (document.fonts.ready) before exporting.
   ============================================================================ */
(function (global) {
  "use strict";

  /* Resolve a CSS var() reference against a root element's computed style. */
  function resolveVar(value, root) {
    if (typeof value !== "string" || value.indexOf("var(") !== 0) return value;
    var inner = value.slice(4, -1).trim();
    var resolved = getComputedStyle(root).getPropertyValue(inner).trim();
    return resolved || "#000";
  }

  /* Replace <use href="#sym"> with an inlined clone of the referenced symbol,
     resolving currentColor / fill so icons render under html2canvas. Then strip
     CSS filter() from SVGs (html2canvas paints filtered SVGs as blank). */
  function resolveUseElements(container) {
    var root = document.documentElement;
    container.querySelectorAll("use").forEach(function (use) {
      var href = use.getAttribute("href") || use.getAttribute("xlink:href");
      if (!href || href.charAt(0) !== "#") return;
      var symbol = document.getElementById(href.slice(1));
      if (!symbol) return;

      var svgNS = "http://www.w3.org/2000/svg";
      var group = document.createElementNS(svgNS, "g");

      var useFill = use.getAttribute("fill");
      var fillColor = useFill ? resolveVar(useFill, root) : getComputedStyle(use).color;
      if (!fillColor || fillColor === "rgb(0, 0, 0)") {
        fillColor = getComputedStyle(use.parentElement).color;
      }

      var keepAttrs = ["x", "y", "width", "height", "transform", "opacity", "role", "aria-label"];
      for (var a = 0; a < use.attributes.length; a++) {
        var attr = use.attributes[a];
        if (attr.name === "href" || attr.name === "xlink:href" || attr.name === "fill") continue;
        if (keepAttrs.indexOf(attr.name) !== -1) group.setAttribute(attr.name, attr.value);
      }

      var children = Array.prototype.slice.call(symbol.children);
      for (var c = 0; c < children.length; c++) {
        var clone = children[c].cloneNode(true);
        if (fillColor) {
          if (clone.getAttribute("fill") === "currentColor") clone.setAttribute("fill", fillColor);
          var cur = clone.querySelectorAll ? clone.querySelectorAll('[fill="currentColor"]') : [];
          for (var cc = 0; cc < cur.length; cc++) cur[cc].setAttribute("fill", fillColor);
        }
        group.appendChild(clone);
      }
      use.parentNode.replaceChild(group, use);
    });

    container.querySelectorAll("svg").forEach(function (svg) {
      svg.style.setProperty("filter", "none", "important");
    });
  }

  /* Pick a background color: explicit option → --paper var on the sheet → white. */
  function pickBackground(opts, sampleEl) {
    if (opts.background) return opts.background;
    if (sampleEl) {
      var v = getComputedStyle(sampleEl).getPropertyValue("--paper").trim();
      if (v) return v;
    }
    return "#ffffff";
  }

  /* Generate and save the PDF. Returns a promise. */
  async function download(opts) {
    opts = opts || {};
    var sheetSelector = opts.sheetSelector || ".sheet";
    var filename = opts.filename || "document.pdf";
    var pageWidthPx = opts.pageWidthPx || 794; // A4 @96dpi
    var pageHeightPx = opts.pageHeightPx || 1123;
    var pageWidthMm = opts.pageWidthMm || 210; // A4 width
    var quality = opts.quality == null ? 0.92 : opts.quality;
    var onProgress = opts.onProgress || function () {};

    if (typeof html2canvas === "undefined" || !global.jspdf) {
      throw new Error("PDF libraries not loaded (need html2canvas + jsPDF).");
    }

    var sheets = document.querySelectorAll(sheetSelector);
    if (!sheets.length) throw new Error("No sheets matched selector: " + sheetSelector);

    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (e) { /* fonts optional */ }
    }

    var jsPDF = global.jspdf.jsPDF;
    var pdf = null;
    var background = pickBackground(opts, sheets[0]);

    var hidden = document.createElement("div");
    hidden.style.cssText = "position:absolute;left:-9999px;top:0;width:" + pageWidthPx + "px;";
    document.body.appendChild(hidden);

    try {
      for (var i = 0; i < sheets.length; i++) {
        onProgress(i + 1, sheets.length);

        var clone = sheets[i].cloneNode(true);
        hidden.innerHTML = "";
        hidden.appendChild(clone);
        clone.style.margin = "0";
        clone.style.boxShadow = "none";

        resolveUseElements(clone);

        var canvas;
        try {
          canvas = await html2canvas(clone, {
            scale: opts.scale || 2, useCORS: true, backgroundColor: background,
            logging: false, allowTaint: true, width: pageWidthPx, height: pageHeightPx,
          });
        } catch (e) {
          // retry at lower scale (memory pressure on big/complex pages)
          canvas = await html2canvas(clone, {
            scale: 1, useCORS: true, backgroundColor: background,
            logging: false, allowTaint: true, width: pageWidthPx, height: pageHeightPx,
          });
        }

        var imgWidth = pageWidthMm;
        var imgHeight = (canvas.height * imgWidth) / canvas.width;
        if (i === 0) {
          pdf = new jsPDF({ unit: "mm", format: [imgWidth, imgHeight], orientation: "portrait" });
        } else {
          pdf.addPage([imgWidth, imgHeight]);
        }
        pdf.addImage(canvas.toDataURL("image/jpeg", quality), "JPEG", 0, 0, imgWidth, imgHeight);
      }
      pdf.save(filename);
    } finally {
      document.body.removeChild(hidden);
    }
  }

  /* Wire a button: disables + shows progress while generating, restores after. */
  function attachButton(target, opts) {
    var btn = typeof target === "string" ? document.querySelector(target) : target;
    if (!btn) throw new Error("PDF button not found: " + target);
    btn.addEventListener("click", async function () {
      if (typeof html2canvas === "undefined" || !global.jspdf) {
        alert("PDF libraries still loading. Please wait a moment and try again.");
        return;
      }
      var originalHTML = btn.innerHTML;
      btn.disabled = true;
      try {
        await download(Object.assign({}, opts, {
          onProgress: function (n, total) { btn.textContent = "Page " + n + " of " + total + "…"; },
        }));
      } catch (err) {
        console.error("PDF generation failed:", err);
        alert("PDF generation failed: " + err.message);
      }
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    });
  }

  global.PdfExport = { download: download, attachButton: attachButton, resolveUseElements: resolveUseElements };
})(window);
