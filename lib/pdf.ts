// lib/pdf.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { User } from '@/types/auth';
import { Payslip } from '@/types/payslip';

/**
 * Generates an HTML string for the payslip
 */
const generatePayslipHTML = (user: User | null, payslip: Payslip) => {
  const employeeName = user?.employee?.firstName
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user?.name || 'Employee';

  const employeeId = user?.employee?.employeeNumber || 'N/A';
  const position = user?.employee?.position || 'N/A';
  const department = user?.employee?.department?.name || 'Unassigned';
  const generatedDate = new Date().toLocaleDateString();

  // Format currency helper
  const formatMoney = (amount: number) =>
    `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1f3c88; padding-bottom: 20px; margin-bottom: 30px; }
          .company-name { font-size: 28px; font-weight: bold; color: #1f3c88; }
          .payslip-title { font-size: 24px; color: #555; text-align: right; }
          
          .section { margin-bottom: 30px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .label { font-weight: bold; color: #666; }
          
          .employee-info { background-color: #f8f9fa; padding: 15px; border-radius: 8px; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { text-align: left; padding: 12px; background-color: #1f3c88; color: white; }
          td { padding: 12px; border-bottom: 1px solid #ddd; }
          .amount-col { text-align: right; }
          
          .total-row td { font-weight: bold; font-size: 16px; border-top: 2px solid #333; }
          .net-pay { background-color: #e8f5e9; color: #1b5e20; font-size: 18px; }
          
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">BizFlow</div>
          <div>
            <div class="payslip-title">PAYSLIP</div>
            <div style="text-align: right; color: #777; margin-top: 5px;">${
              payslip.month
            } ${payslip.year}</div>
          </div>
        </div>

        <div class="section employee-info">
          <div class="row">
            <div><span class="label">Employee Name:</span> ${employeeName}</div>
            <div><span class="label">Employee ID:</span> ${employeeId}</div>
          </div>
          <div class="row" style="margin-top: 10px;">
            <div><span class="label">Department:</span> ${department}</div>
            <div><span class="label">Position:</span> ${position}</div>
          </div>
        </div>

        <div class="section">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="amount-col">Earnings</th>
                <th class="amount-col">Deductions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Basic Salary</td>
                <td class="amount-col">${formatMoney(
                  payslip.grossPay - payslip.overtime
                )}</td>
                <td class="amount-col">-</td>
              </tr>
              <tr>
                <td>Overtime</td>
                <td class="amount-col">${formatMoney(payslip.overtime)}</td>
                <td class="amount-col">-</td>
              </tr>
              <tr>
                <td>Tax & Deductions</td>
                <td class="amount-col">-</td>
                <td class="amount-col">${formatMoney(payslip.deductions)}</td>
              </tr>
              
              <tr class="total-row">
                <td>Total</td>
                <td class="amount-col">${formatMoney(payslip.grossPay)}</td>
                <td class="amount-col" style="color: #d32f2f;">${formatMoney(
                  payslip.deductions
                )}</td>
              </tr>
              
              <tr class="total-row net-pay">
                <td>NET PAY</td>
                <td colspan="2" class="amount-col">${formatMoney(
                  payslip.netPay
                )}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Generated on ${generatedDate} via BizFlow Mobile App</p>
          <p>This is a system-generated document and does not require a signature.</p>
        </div>
      </body>
    </html>
  `;
};

/**
 * Generates a PDF file and opens the share dialog
 */
export const downloadPayslipPDF = async (
  user: User | null,
  payslip: Payslip
) => {
  try {
    const html = generatePayslipHTML(user, payslip);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Share PDF
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: `Payslip - ${payslip.month} ${payslip.year}`,
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate payslip PDF');
  }
};
