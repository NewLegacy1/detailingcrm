-- Use SVG placeholder images for service templates (if they were seeded with .jpg)
update public.service_templates
set image_url = replace(image_url, '.jpg', '.svg')
where image_url like '%.jpg';
