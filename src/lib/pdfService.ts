import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PerformanceLog, TeacherRecord, YearlyKpiRecord } from '../types';

export const pdfService = {
  generatePerformanceReport(teacher: TeacherRecord, logs: PerformanceLog[]) {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('TEACHER PERFORMANCE REPORT', 105, 20, { align: 'center' });
    
    // Teacher Info
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Staff Name: ${teacher.fullName}`, 14, 40);
    doc.text(`Staff ID: ${teacher.icNumber}`, 14, 47);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 54);
    doc.text(`Current KPI Score: ${teacher.currentScore || 0}`, 14, 61);

    // Logs Table
    const tableData = logs.map(log => [
      new Date(log.timestamp.seconds * 1000).toLocaleDateString(),
      log.category,
      log.criterion || '-',
      log.severity,
      log.amount > 0 ? `+${log.amount}` : log.amount,
      log.reason || 'N/A'
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['Date', 'Category', 'Criterion', 'Severity', 'Score', 'Remarks']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }, // Primary color
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Page ${i} of ${pageCount}`, 105, 287, { align: 'center' });
    }

    doc.save(`${teacher.fullName}_Performance_Report.pdf`);
  },

  generateYearlyKpiReport(teacher: TeacherRecord, kpi: YearlyKpiRecord) {
    const doc = new jsPDF();
    
    doc.setFontSize(24);
    doc.text('YEARLY KPI ASSESSMENT', 105, 30, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text('ORGANIZATIONAL PERFORMANCE REVIEW', 105, 40, { align: 'center' });
    
    doc.line(20, 45, 190, 45);

    doc.setFontSize(12);
    doc.text(`FACULTY MEMBER: ${teacher.fullName}`, 20, 60);
    doc.text(`ASSESSMENT YEAR: ${kpi.year}`, 20, 68);
    doc.text(`RATING ASSIGNED: ${kpi.rating}`, 20, 76);
    doc.text(`STATUS: ${kpi.status}`, 20, 84);

    autoTable(doc, {
      startY: 95,
      head: [['KPI Metric', 'Value']],
      body: [
        ['Avg Monthly Score', kpi.averageMonthlyScore.toFixed(2)],
        ['Trend Factor', `${kpi.trendFactor.toFixed(1)}x`],
        ['Final KPI Points', kpi.finalScore.toFixed(2)],
        ['Performance Tier', kpi.rating === 'A' ? 'Distinction' : kpi.rating === 'B' ? 'Excellent' : 'Satisfactory']
      ],
      theme: 'plain',
      styles: { cellPadding: 5, fontSize: 11 }
    });

    doc.setFontSize(10);
    doc.text('Evaluator Remarks:', 20, 140);
    doc.rect(20, 145, 170, 40);
    doc.text(kpi.notes || 'No adjustment notes provided.', 25, 155, { maxWidth: 160 });

    doc.text('Principal Signature:', 20, 210);
    doc.line(20, 225, 80, 225);
    
    doc.text('Teacher Acknowledgment:', 120, 210);
    doc.line(120, 225, 180, 225);

    doc.save(`${teacher.fullName}_Yearly_KPI_${kpi.year}.pdf`);
  },

  generateSchoolSummaryReport(teachers: TeacherRecord[]) {
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text('SCHOOL PERFORMANCE SUMMARY', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total Faculty Members: ${teachers.length}`, 14, 37);

    const tableData = teachers
      .sort((a, b) => (b.currentScore || 0) - (a.currentScore || 0))
      .map((t, index) => [
        index + 1,
        t.fullName,
        t.icNumber,
        t.currentScore || 0,
        (t.currentScore || 0) > 20 ? 'Distinction' : (t.currentScore || 0) < 0 ? 'Intervention' : 'Satisfactory'
      ]);

    autoTable(doc, {
      startY: 45,
      head: [['Rank', 'Staff Name', 'IC Number', 'KPI Score', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`School_Performance_Summary_${new Date().getFullYear()}.pdf`);
  }
};
