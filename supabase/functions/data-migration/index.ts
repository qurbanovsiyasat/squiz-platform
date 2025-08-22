Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        console.log('Starting comprehensive data migration from source to target project');
        
        // Source project credentials (mmx-agent-1753975949508)
        const sourceUrl = 'https://bhykzkqlyfcagrnkubnr.supabase.co';
        const sourceServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeWt6a3FseWZjYWdybmt1Ym5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzk3NTUzNiwiZXhwIjoyMDY5NTUxNTM2fQ.AVu_pk70hwcC1aS_QBvRnwq_wUZheSWQsyoCbQYhpcY';
        
        // Target project credentials (squiz-platform-eu)
        const targetUrl = 'https://vwbtqlckqybctnglbbdk.supabase.co';
        const targetServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3YnRxbGNrcXliY3RuZ2xiYmRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0OTI3NCwiZXhwIjoyMDcxMTI1Mjc0fQ.aZLdYlHALB04Q3PN0lQif4M-tMNAoUNeArgk4zmD43E';

        const results = { migrated: [], errors: [], summary: {} };

        // List of tables to migrate in dependency order
        const tablesToMigrate = [
            'profiles',
            'categories', 
            'quizzes',
            'questions',
            'quiz_results',
            'quiz_attempts',
            'quiz_likes',
            'quiz_ratings',
            'quiz_views',
            'forms',
            'form_fields',
            'form_submissions',
            'form_likes',
            'form_views',
            'qa_questions',
            'qa_answers',
            'qa_likes',
            'qa_views',
            'qa_votes',
            'forum_posts',
            'forum_replies',
            'forum_likes',
            'notifications',
            'user_achievements',
            'user_votes',
            'ai_conversations'
        ];

        // Helper function to fetch data from source
        async function fetchFromSource(table) {
            try {
                const response = await fetch(`${sourceUrl}/rest/v1/${table}?select=*`, {
                    headers: {
                        'Authorization': `Bearer ${sourceServiceKey}`,
                        'apikey': sourceServiceKey,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${table}: ${response.status}`);
                }
                
                const data = await response.json();
                console.log(`Fetched ${data.length} records from ${table}`);
                return data;
            } catch (error) {
                console.error(`Error fetching ${table}:`, error.message);
                return [];
            }
        }

        // Helper function to insert data to target
        async function insertToTarget(table, data) {
            if (!data || data.length === 0) {
                console.log(`No data to migrate for ${table}`);
                return { success: true, count: 0 };
            }

            try {
                const response = await fetch(`${targetUrl}/rest/v1/${table}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${targetServiceKey}`,
                        'apikey': targetServiceKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to insert ${table}: ${response.status} - ${errorText}`);
                }

                console.log(`Successfully migrated ${data.length} records to ${table}`);
                return { success: true, count: data.length };
            } catch (error) {
                console.error(`Error inserting to ${table}:`, error.message);
                return { success: false, error: error.message, count: 0 };
            }
        }

        // Start migration process
        console.log('Starting table-by-table migration...');
        
        for (const table of tablesToMigrate) {
            console.log(`\n=== Migrating ${table} ===`);
            
            try {
                // Fetch data from source
                const sourceData = await fetchFromSource(table);
                
                if (sourceData.length > 0) {
                    // Insert data to target
                    const insertResult = await insertToTarget(table, sourceData);
                    
                    results.migrated.push({
                        table,
                        records: insertResult.count,
                        success: insertResult.success
                    });
                    
                    if (!insertResult.success) {
                        results.errors.push({
                            table,
                            error: insertResult.error
                        });
                    }
                } else {
                    results.migrated.push({
                        table,
                        records: 0,
                        success: true,
                        note: 'No data to migrate'
                    });
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`Error migrating ${table}:`, error.message);
                results.errors.push({
                    table,
                    error: error.message
                });
            }
        }

        // Calculate summary
        const totalRecords = results.migrated.reduce((sum, item) => sum + item.records, 0);
        const successfulTables = results.migrated.filter(item => item.success).length;
        const failedTables = results.errors.length;
        
        results.summary = {
            totalTables: tablesToMigrate.length,
            successfulTables,
            failedTables,
            totalRecordsMigrated: totalRecords,
            completionTime: new Date().toISOString()
        };

        console.log('\n=== MIGRATION COMPLETE ===');
        console.log(`Total records migrated: ${totalRecords}`);
        console.log(`Successful tables: ${successfulTables}/${tablesToMigrate.length}`);
        console.log(`Failed tables: ${failedTables}`);

        return new Response(JSON.stringify({
            success: true,
            message: 'Data migration completed',
            data: results
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Migration function error:', error);

        const errorResponse = {
            success: false,
            error: {
                code: 'MIGRATION_FAILED',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});