import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixUser() {
  // Update the old user to have the telegram_id
  const { data, error } = await supabase
    .from('users')
    .update({ telegram_id: '8478395147' })
    .eq('id', '45bf12db-bbfd-4a57-bbea-2e8bc1bbe5a5')
    .select();

  if (error) {
    console.error('Error updating user:', error);
  } else {
    console.log('Updated user:', data);
  }

  // Delete the duplicate user created by web auth
  const { error: deleteError } = await supabase
    .from('users')
    .delete()
    .eq('id', '76b86fbc-f8f4-4e0f-becb-53ded9a5150f');

  if (deleteError) {
    console.error('Error deleting duplicate user:', deleteError);
  } else {
    console.log('Deleted duplicate user');
  }
}

fixUser();
