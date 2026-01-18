
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkColumns() {
    console.log('--- NOTIFICATIONS SPECIFIC COLS ---')
    const { data, error } = await supabase.from('notifications').select('user_type, data, updated_at').limit(1)
    if (error) {
        console.error('Missing columns in notifications:', error.message)
    } else {
        console.log('Notifications columns exist!')
    }

    console.log('--- PROFILES SPECIFIC COLS ---')
    const { data: profData, error: profError } = await supabase.from('profiles').select('email, full_name, role').limit(1)
    if (profError) {
        console.error('Missing columns in profiles:', profError.message)
    } else {
        console.log('Profiles columns exist!')
    }
}

checkColumns()
