import httpx

with open('test_saree.jpg', 'rb') as f:
    img_bytes = f.read()

print(f'Sending {len(img_bytes)} byte image to /api/v1/studio/enhance-studio ...\n')

with httpx.Client(timeout=60) as client:
    res = client.post(
        'http://127.0.0.1:8000/api/v1/studio/enhance-studio',
        files={'image': ('test_saree.jpg', img_bytes, 'image/jpeg')},
        data={'product_id': 'demo-saree-001', 'remove_bg': 'true'}
    )

print('HTTP Status:', res.status_code)
body = res.json()

print()
print('=== RESPONSE ===')
print('status              :', body['status'])
print('auto_cropped_ratio  :', body['auto_cropped_ratio'])
print('clahe_applied       :', body['clahe_applied'])
print('background_removed  :', body['background_removed'])
print('crop_applied        :', body['crop_applied'])
print('rembg_used          :', body['rembg_used'])
print('complexity_score    :', body['visual_complexity_score'])
print('enhanced_image_url  :', body['enhanced_image_url'])
print('raw_image_url       :', body['raw_image_url'])
print()
print('complexity_pricing_factor:')
print(' ', body['complexity_pricing_factor'])
print()
print('authenticity_guarantee:')
print(' ', body['authenticity_guarantee'])
print()
print('=== PIPELINE STEPS ===')
for step in body['pipeline_steps']:
    tick = 'OK' if step['applied'] else 'SKIP'
    print(f'  [{tick}] {step["step_name"]} ({step["step_code"]})')
    print(f'      {step["description"][:110]}')
print()
print('message:', body.get('message', ''))
