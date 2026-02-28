-- Rename add-on template and any org copies from "Sand / Dirt Extraction" to "Sand Removal"

update public.upsell_templates
set name = 'Sand Removal'
where name = 'Sand / Dirt Extraction';

update public.service_upsells
set name = 'Sand Removal'
where name = 'Sand / Dirt Extraction';
