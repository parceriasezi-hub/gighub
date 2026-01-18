
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkConflict() {
    const targetId = '1748f89d-080c-4abe-a033-ad07d405f786';

    // 1. Get the target template
    const { data: target } = await supabase.from('email_templates').select('trigger_key').eq('id', targetId).single();
    console.log("Target template trigger:", target?.trigger_key);

    if (!target) return;

    // 2. Search for ANY OTHER template with the same trigger_key?
    if (target.trigger_key) {
        const { data: duplicates } = await supabase
            .from('email_templates')
            .select('id, name, slug')
            .eq('trigger_key', target.trigger_key)
            .neq('id', targetId);

        console.log(`Duplicates for '${target.trigger_key}':`, duplicates);
    }

    // 3. What if the user is trying to set it to 'welcome_email'?
    // Let's check who owns 'welcome_email'
    const { data: owners } = await supabase.from('email_templates').select('id, name').eq('trigger_key', 'welcome_email');
    console.log("Owners of 'welcome_email':", JSON.stringify(owners, null, 2));
}

checkConflict().catch(console.error);
