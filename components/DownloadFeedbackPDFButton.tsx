"use client";
import jsPDF from "jspdf";

const DownloadFeedbackPDFButton = ({ targetId = "feedback-section" }) => {
  const handleDownload = () => {
    const input = document.getElementById(targetId);
    if (!input) return;

    // Title
    const title = input.querySelector('h1')?.textContent?.trim() || 'Interview Feedback';

    // Overall Score and Date
    const overallScore = input.querySelector('.text-primary-200')?.textContent?.trim() || '';
    const date = input.querySelector('img[alt="calendar"]')?.parentElement?.querySelector('p')?.textContent?.trim() || '';

    // Final Assessment (the <p> after <hr />)
    let assessment = '';
    const hr = input.querySelector('hr');
    if (hr) {
      let next = hr.nextElementSibling;
      while (next && next.tagName !== 'P') next = next.nextElementSibling;
      if (next && next.tagName === 'P') assessment = next.textContent?.trim() || '';
    }

    // Breakdown: find the h2, then all following divs until the next h3 or end
    let breakdown = [];
    const h2 = input.querySelector('h2');
    if (h2) {
      let node = h2.parentElement;
      if (node) {
        // Find all divs inside this block
        const divs = node.querySelectorAll('div');
        divs.forEach((div) => {
          // Each category block has two <p>s: one bold (name/score), one comment
          const ps = div.querySelectorAll('p');
          if (ps.length >= 2) {
            breakdown.push({
              title: ps[0].textContent?.trim() || '',
              comment: ps[1].textContent?.trim() || '',
            });
          }
        });
      }
    }

    // Strengths and Areas for Improvement
    let strengths = [];
    let improvements = [];
    const h3s = input.querySelectorAll('h3');
    h3s.forEach((h3) => {
      const text = h3.textContent || '';
      const next = h3.nextElementSibling;
      if (text.includes('Strengths') && next && next.tagName === 'UL') {
        next.querySelectorAll('li').forEach((li) => strengths.push(li.textContent?.trim() || ''));
      }
      if (text.includes('Areas for Improvement') && next && next.tagName === 'UL') {
        next.querySelectorAll('li').forEach((li) => improvements.push(li.textContent?.trim() || ''));
      }
    });

    // PDF generation
    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    const lineHeight = 20;
    let y = margin;

    // Title
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, pageWidth / 2, y, { align: 'center' });
    y += lineHeight * 2;

    // Score and Date
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    if (overallScore) {
      pdf.text(`Overall Impression: ${overallScore}/100`, margin, y);
      y += lineHeight;
    }
    if (date) {
      pdf.text(`Date: ${date}`, margin, y);
      y += lineHeight * 1.5;
    }

    // Assessment
    if (assessment) {
      pdf.setFontSize(12);
      const lines = pdf.splitTextToSize(assessment, pageWidth - 2 * margin);
      pdf.text(lines, margin, y);
      y += lines.length * lineHeight + lineHeight;
    }

    // Breakdown
    if (breakdown.length > 0) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Breakdown of the Interview:', margin, y);
      y += lineHeight * 1.5;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      breakdown.forEach((cat) => {
        // Category title
        pdf.setFont('helvetica', 'bold');
        const catTitleLines = pdf.splitTextToSize(cat.title, pageWidth - 2 * margin);
        pdf.text(catTitleLines, margin, y);
        y += catTitleLines.length * lineHeight;
        // Category comment
        pdf.setFont('helvetica', 'normal');
        const catCommentLines = pdf.splitTextToSize(cat.comment, pageWidth - 2 * margin);
        pdf.text(catCommentLines, margin + 10, y);
        y += catCommentLines.length * lineHeight + lineHeight / 2;
        if (y > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
      });
      y += lineHeight / 2;
    }

    // Strengths
    if (strengths.length > 0) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Strengths:', margin, y);
      y += lineHeight * 1.5;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      strengths.forEach((s) => {
        const lines = pdf.splitTextToSize(`• ${s}`, pageWidth - 2 * margin);
        pdf.text(lines, margin, y);
        y += lines.length * lineHeight;
        if (y > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
      });
      y += lineHeight;
    }

    // Areas for Improvement
    if (improvements.length > 0) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Areas for Improvement:', margin, y);
      y += lineHeight * 1.5;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      improvements.forEach((s) => {
        const lines = pdf.splitTextToSize(`• ${s}`, pageWidth - 2 * margin);
        pdf.text(lines, margin, y);
        y += lines.length * lineHeight;
        if (y > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
      });
    }

    pdf.save("interview-feedback.pdf");
  };

  return (
    <button
      onClick={handleDownload}
      className="btn-primary px-4 py-2 rounded font-semibold"
      style={{ marginLeft: 8 }}
    >
      Download PDF
    </button>
  );
};

export default DownloadFeedbackPDFButton; 