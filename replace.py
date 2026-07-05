with open('backend/routers/orders.py', 'r') as f:
    lines = f.readlines()

new_code = """        pdf = FPDF()
        pdf.add_page()
        
        # Main Background (Dark)
        pdf.set_fill_color(10, 10, 10)
        pdf.rect(0, 0, 210, 297, "F")
        
        # Gold Outer Border
        pdf.set_draw_color(221, 184, 92)
        pdf.set_line_width(2.0)
        pdf.rect(6, 6, 198, 285, "D")
        
        # Inner thin gold border
        pdf.set_line_width(0.5)
        pdf.rect(9, 9, 192, 279, "D")
        
        # Header Box (Dark Theme)
        pdf.set_fill_color(10, 10, 10)
        pdf.rect(10, 10, 190, 40, "F")
        pdf.set_fill_color(221, 184, 92) # Gold underline
        pdf.rect(10, 50, 190, 1.0, "F")
        
        # Header - Restaurant Name
        pdf.set_text_color(221, 184, 92) # Gold Text
        pdf.set_font("Helvetica", "B", 26)
        pdf.set_y(20)
        pdf.set_x(15)
        pdf.cell(text=rest_name.upper(), w=120, align="L")
        
        pdf.set_text_color(250, 245, 236)
        pdf.set_font("Helvetica", "I", 10)
        pdf.set_y(32)
        pdf.set_x(15)
        pdf.cell(text="MULTI CUISINE RESTAURANT", w=120, align="L")
        
        # Header - SmartDine AI Right Side
        pdf.set_y(22)
        pdf.set_x(115)
        pdf.set_font("Helvetica", "B", 18)
        pdf.set_text_color(250, 245, 236)
        pdf.cell(text="SmartDine AI", w=80, align="R")
        pdf.set_y(32)
        pdf.set_x(115)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(221, 184, 92)
        pdf.cell(text="AI-POWERED DINING EXPERIENCE", w=80, align="R")
        
        pdf.ln(30)
        
        # Section Titles
        pdf.set_fill_color(221, 184, 92)
        pdf.set_text_color(10, 10, 10)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_x(15)
        pdf.cell(text="  BILL DETAILS", w=85, h=8, fill=True)
        pdf.cell(text="", w=10) # Gap
        pdf.cell(text="  RESTAURANT DETAILS", w=85, h=8, fill=True, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)
        
        # Date & Time formatting
        created = order.get("created_at", "")
        dt_str = created
        tm_str = ""
        if created:
            try:
                dt = datetime.fromisoformat(created)
                dt_str = dt.strftime("%d %b %Y")
                tm_str = dt.strftime("%I:%M %p")
            except ValueError:
                pass

        # Details Content
        pdf.set_x(15)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(221, 184, 92)
        pdf.cell(text="Bill No.", w=25)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(250, 245, 236)
        pdf.cell(text=f": SDM/{order.get('token', '000')}", w=60)
        
        pdf.cell(text="", w=10)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(221, 184, 92)
        pdf.cell(text="Address", w=20)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(250, 245, 236)
        pdf.cell(text=f": {rest.get('address', 'Katedan, Hyderabad - 500077')}"[:40], w=65, new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_x(15)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(221, 184, 92)
        pdf.cell(text="Order No.", w=25)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(250, 245, 236)
        pdf.cell(text=f": ORD/{order_id[:8].upper()}", w=60)
        
        pdf.cell(text="", w=10)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(221, 184, 92)
        pdf.cell(text="Phone", w=20)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(250, 245, 236)
        pdf.cell(text=f": {rest.get('phone', '+91 88888 88888')}", w=65, new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_x(15)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(221, 184, 92)
        pdf.cell(text="Date", w=25)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(250, 245, 236)
        pdf.cell(text=f": {dt_str}", w=60)
        
        pdf.cell(text="", w=10)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(221, 184, 92)
        pdf.cell(text="Website", w=20)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(250, 245, 236)
        domain = rest_name.lower().replace(" ", "")
        pdf.cell(text=f": www.{domain}.com", w=65, new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_x(15)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(221, 184, 92)
        pdf.cell(text="Time", w=25)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(250, 245, 236)
        pdf.cell(text=f": {tm_str}", w=60)
        
        pdf.cell(text="", w=10)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(221, 184, 92)
        pdf.cell(text="Email", w=20)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(250, 245, 236)
        pdf.cell(text=f": contact@{domain}.com", w=65, new_x="LMARGIN", new_y="NEXT")

        pdf.set_x(15)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(221, 184, 92)
        pdf.cell(text="Table No.", w=25)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(96, 182, 52) # Green for table
        pdf.cell(text=f": {order.get('table_number', 'Takeaway')}", w=60)
        
        pdf.cell(text="", w=10)
        pdf.set_font("Helvetica", "I", 11)
        pdf.set_text_color(221, 184, 92)
        pdf.cell(text=" Thank you for dining with us!", w=85, new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_x(15)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(221, 184, 92)
        pdf.cell(text="Token No.", w=25)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(250, 245, 236)
        pdf.cell(text=f": #{order.get('token', '0')}", w=60, new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_x(15)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(221, 184, 92)
        pdf.cell(text="Waiter", w=25)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(250, 245, 236)
        pdf.cell(text=": AI Waiter (SmartDine AI)", w=60, new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_x(15)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(221, 184, 92)
        pdf.cell(text="Guests", w=25)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(250, 245, 236)
        pdf.cell(text=f": {order.get('customer_name', 'Guest')}", w=60, new_x="LMARGIN", new_y="NEXT")
        
        pdf.ln(8)
        
        # Table Header
        pdf.set_x(15)
        pdf.set_fill_color(221, 184, 92) # Gold background for header
        pdf.set_text_color(10, 10, 10) # Dark text
        pdf.set_font("Helvetica", "B", 9)
        col_w = [15, 80, 20, 30, 35]
        headers = ["S.NO.", "ITEM NAME", "QTY.", "RATE (INR)", "AMOUNT (INR)"]
        for h, w in zip(headers, col_w):
            pdf.cell(text=h, w=w, h=9, align="C" if h != "ITEM NAME" else "L", fill=True)
        pdf.ln(9)
        
        # Table Rows
        pdf.set_font("Helvetica", "", 9)
        
        alt_bg = False
        for idx, item in enumerate(order.get("items", []), 1):
            name = item.get("name", "Unknown")[:45]
            qty = item.get("qty", 1)
            price = float(item.get("price", 0))
            if alt_bg:
                pdf.set_fill_color(30, 30, 30)
            else:
                pdf.set_fill_color(20, 20, 20)
            alt_bg = not alt_bg
            
            pdf.set_x(15)
            pdf.set_text_color(250, 245, 236)
            pdf.cell(text=str(idx), w=col_w[0], align="C", fill=True)
            pdf.cell(text=name, w=col_w[1], align="L", fill=True)
            pdf.cell(text=str(qty), w=col_w[2], align="C", fill=True)
            pdf.cell(text=f"{price:.2f}", w=col_w[3], align="C", fill=True)
            pdf.cell(text=f"{price*qty:.2f}", w=col_w[4], align="C", fill=True)
            pdf.ln(7)
            notes = item.get("notes", "")
            if notes:
                pdf.set_x(15)
                pdf.set_font("Helvetica", "I", 8)
                pdf.set_text_color(150, 150, 150)
                pdf.cell(text="", w=col_w[0], fill=True)
                pdf.cell(text="* " + str(notes)[:80], w=col_w[1], new_x="LMARGIN", new_y="NEXT", fill=True)
                pdf.set_font("Helvetica", "", 9)
                pdf.set_text_color(250, 245, 236)
                pdf.ln(1)
        
        pdf.ln(2)
        pdf.set_x(15)
        pdf.set_draw_color(221, 184, 92)
        pdf.line(15, pdf.get_y(), 195, pdf.get_y())
        pdf.ln(4)
        
        # Payment Summary & Mode
        subtotal = float(order.get("subtotal", 0))
        tax = float(order.get("tax", 0))
        total = float(order.get("total", 0))
        pay_status = order.get("payment_status", "unpaid")
        pay_method = order.get("payment_method", "cash")
        
        y_before = pdf.get_y()
        
        # Left Box (Summary)
        pdf.set_x(15)
        pdf.set_fill_color(221, 184, 92)
        pdf.set_text_color(10, 10, 10)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(text="  PAYMENT SUMMARY", w=85, h=8, fill=True, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)
        pdf.set_text_color(250, 245, 236)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_x(15)
        pdf.cell(text="Subtotal", w=55)
        pdf.cell(text=f"INR {subtotal:.2f}", w=30, align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(1)
        pdf.set_x(15)
        pdf.cell(text="Discount", w=55)
        pdf.cell(text="INR 0.00", w=30, align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(1)
        pdf.set_x(15)
        pdf.cell(text="Taxable Amount", w=55)
        pdf.cell(text=f"INR {subtotal:.2f}", w=30, align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(1)
        pdf.set_x(15)
        pdf.cell(text="CGST (2.5%)", w=55)
        pdf.cell(text=f"INR {tax/2:.2f}", w=30, align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(1)
        pdf.set_x(15)
        pdf.cell(text="SGST (2.5%)", w=55)
        pdf.cell(text=f"INR {tax/2:.2f}", w=30, align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)
        pdf.set_draw_color(221, 184, 92)
        pdf.line(15, pdf.get_y(), 100, pdf.get_y())
        pdf.ln(3)
        pdf.set_x(15)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(96, 182, 52) # Green Total
        pdf.cell(text="GRAND TOTAL", w=55)
        pdf.set_text_color(221, 184, 92)
        pdf.cell(text=f"INR {total:.2f}", w=30, align="R", new_x="LMARGIN", new_y="NEXT")
        
        # Right Box (Mode)
        pdf.set_y(y_before)
        pdf.set_x(110)
        pdf.set_fill_color(221, 184, 92)
        pdf.set_text_color(10, 10, 10)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(text="  PAYMENT MODE", w=85, h=8, fill=True)
        pdf.set_y(y_before + 13)
        pdf.set_x(110)
        pdf.set_font("Helvetica", "B", 9)
        if pay_status == "paid":
            pdf.set_text_color(96, 182, 52)
        else:
            pdf.set_text_color(250, 245, 236)
        pdf.cell(text=f"[Paid via {str(pay_method).upper()}]" if pay_status == "paid" else f"[{str(pay_method).upper()}]", w=85)
        pdf.set_y(y_before + 23)
        pdf.set_x(110)
        pdf.set_text_color(221, 184, 92)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(text="Transaction ID", w=35)
        pdf.set_text_color(250, 245, 236)
        pdf.cell(text=f": {order_id[:12].upper()}")
        pdf.set_y(y_before + 28)
        pdf.set_x(110)
        pdf.set_text_color(221, 184, 92)
        pdf.cell(text="Payment Status", w=35)
        if pay_status == "paid":
            pdf.set_text_color(96, 182, 52)
        else:
            pdf.set_text_color(250, 245, 236)
        pdf.cell(text=f": {str(pay_status).upper()}")
        pdf.set_y(y_before + 33)
        pdf.set_x(110)
        pdf.set_text_color(221, 184, 92)
        pdf.cell(text="Payment Date", w=35)
        pdf.set_text_color(250, 245, 236)
        pdf.cell(text=f": {dt_str} {tm_str}")
        
        pdf.set_y(y_before + 45)
        pdf.set_x(110)
        pdf.set_font("Helvetica", "I", 24)
        pdf.set_text_color(96, 182, 52) # Green Enjoy text
        pdf.cell(text="We serve, you enjoy! ♥", w=85, align="C")
        
        # Footer Box (Dark Theme with Gold Outline)
        pdf.set_fill_color(10, 10, 10)
        pdf.rect(10, 260, 190, 27, "F")
        pdf.set_fill_color(221, 184, 92) # Gold underline
        pdf.rect(10, 259, 190, 1.0, "F")
        
        pdf.set_y(266)
        pdf.set_x(15)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(250, 245, 236)
        pdf.cell(text="Loved your experience?", w=60, align="L", new_x="LMARGIN", new_y="NEXT")
        pdf.set_x(15)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(221, 184, 92)
        pdf.cell(text="Scan to rate us on Google", w=60, align="L")
        
        pdf.set_y(266)
        pdf.set_x(100)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(250, 245, 236)
        pdf.cell(text="SmartDine AI", w=95, align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.set_x(100)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(221, 184, 92)
        pdf.cell(text="Go Green. Save Paper. | www.smartdineai.co.in", w=95, align="R")
"""

lines = lines[:729] + [new_code] + lines[1010:]

with open('backend/routers/orders.py', 'w') as f:
    f.writelines(lines)
