import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Exports a DOM element to a professional PDF file.
 */
export async function exportToPDF(elementId: string, filename: string = "write-iq-document.pdf") {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Export failed: Element not found", elementId);
    return;
  }

  // Clone or style for print
  const originalStyle = element.style.cssText;
  element.style.padding = "40px";
  element.style.backgroundColor = "#ffffff";
  element.style.color = "#000000";

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [canvas.width / 2, canvas.height / 2], // Match canvas size to prevent stretching
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  } catch (error) {
    console.error("PDF generation error:", error);
    throw error;
  } finally {
    // Restore original styles
    element.style.cssText = originalStyle;
  }
}

/**
 * Exports plain text to a Markdown file.
 */
export function exportToMarkdown(text: string, filename: string = "document.md") {
  const blob = new Blob([text], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".md") ? filename : `${filename}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports plain text to a TXT file.
 */
export function exportToTxt(text: string, filename: string = "document.txt") {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".txt") ? filename : `${filename}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
