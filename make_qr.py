"""Make the QR code for the CropDoctor download page.

Usage:   python make_qr.py https://YOUR-SITE.netlify.app/get-app.html
Needs:   pip install "qrcode[pil]"
Output:  cropdoctor-qr.png (print it or share it on WhatsApp)
"""
import sys

try:
    import qrcode
    from qrcode.constants import ERROR_CORRECT_H
except ImportError:
    sys.exit('Run this first:  pip install "qrcode[pil]"')

if len(sys.argv) != 2 or not sys.argv[1].startswith('https://'):
    sys.exit('Usage: python make_qr.py https://YOUR-SITE.netlify.app/get-app.html')

qr = qrcode.QRCode(error_correction=ERROR_CORRECT_H, box_size=16, border=4)
qr.add_data(sys.argv[1])
qr.make(fit=True)
qr.make_image(fill_color='#194c30', back_color='white').save('cropdoctor-qr.png')
print('Saved cropdoctor-qr.png for', sys.argv[1])
