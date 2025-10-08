import { Provider } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { SupabaseClient } from "@supabase/supabase-js"

export const SupabaseProvider: Provider = {
  provide: 'SUPABASE_CLIENT',
  inject: [ConfigService],
  useFactory: (configService: ConfigService): SupabaseClient => {
    const url = configService.get<string>('SUPABASE_URL');
    const key = configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) {
      throw new Error('Missing Supabase URL or Service Role Key');
    }
    return new SupabaseClient(url, key);
  },
}
