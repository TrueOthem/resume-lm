'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from 'next/cache';
import { simplifiedJobSchema } from "@/lib/zod-schemas";
import type { Job } from "@/lib/types";
import { z } from "zod";
import { JobListingParams } from "./schema";

export async function createJob(jobListing: z.infer<typeof simplifiedJobSchema>) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('User not authenticated');

  // Robust mapping and fallback for required fields
  // Only use fields that exist on jobListing
  const jobData = {
    user_id: user.id,
    title: (jobListing as z.infer<typeof simplifiedJobSchema>).position_title || "Untitled Job",
    company: (jobListing as z.infer<typeof simplifiedJobSchema>).company_name || "",
    description: jobListing.description || "",
    job_url: jobListing.job_url || "",
    // Only include fields that exist in your DB schema
  };

  // Log all fields, values, and types
  console.log('[createJob] Job data fields:', Object.entries(jobData).map(([k, v]) => [k, v, typeof v]));

  try {
    const { data, error } = await supabase
      .from('jobs')
      .insert([jobData])
      .select()
      .single();

    if (error) {
      console.error('[createJob] Error creating job:', error);
      if (typeof error === 'object' && error && 'stack' in error) {
        console.error('[createJob] Error stack:', error.stack);
      }
      console.error('[createJob] Job data:', jobData);
      throw error;
    }
    return data;
  } catch (err) {
    console.error('[createJob] Unexpected error:', err);
    if (typeof err === 'object' && err && 'stack' in err) {
      console.error('[createJob] Error stack:', err.stack);
    }
    throw err;
  }
}

export async function deleteJob(jobId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('User not authenticated');
  }

  // First, get all resumes that reference this job
  const { data: affectedResumes } = await supabase
    .from('resumes')
    .select('id')
    .eq('job_id', jobId);

  // Delete the job
  const { error: deleteError } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId);

  if (deleteError) {
    console.error('Delete error:', deleteError);
    throw new Error('Failed to delete job');
  }

  // Revalidate all affected resume paths
  affectedResumes?.forEach(resume => {
    revalidatePath(`/resumes/${resume.id}`);
  });
  
  // Also revalidate the general paths
  revalidatePath('/', 'layout');
  revalidatePath('/resumes', 'layout');
}


export async function getJobListings({ 
  page = 1, 
  pageSize = 10, 
  filters 
}: JobListingParams) {
  const supabase = await createClient();

  // Calculate offset
  const offset = (page - 1) * pageSize;

  // Start building the query
  let query = supabase
    .from('jobs')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // Apply filters if they exist
  if (filters) {
    if (filters.workLocation) {
      query = query.eq('work_location', filters.workLocation);
    }
    if (filters.employmentType) {
      query = query.eq('employment_type', filters.employmentType);
    }
    if (filters.keywords && filters.keywords.length > 0) {
      query = query.contains('keywords', filters.keywords);
    }
  }

  // Add pagination
  const { data: jobs, error, count } = await query
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error('Error fetching jobs:', error);
    throw new Error('Failed to fetch job listings');
  }

  return {
    jobs,
    totalCount: count ?? 0,
    currentPage: page,
    totalPages: Math.ceil((count ?? 0) / pageSize)
  };
}

export async function deleteTailoredJob(jobId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('jobs')
    .update({ is_active: false })
    .eq('id', jobId);

  if (error) {
    throw new Error('Failed to delete job');
  }

  revalidatePath('/', 'layout');
}

export async function createEmptyJob(): Promise<Job> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  const emptyJob: Partial<Job> = {
    user_id: user.id,
    company_name: 'New Company',
    position_title: 'New Position',
    job_url: null,
    description: null,
    location: null,
    salary_range: null,
    keywords: [],
    work_location: null,
    employment_type: null,
    is_active: true
  };

  const { data, error } = await supabase
    .from('jobs')
    .insert([emptyJob])
    .select()
    .single();

  if (error) {
    console.error('Error creating job:', error);
    throw new Error('Failed to create job');
  }

  revalidatePath('/', 'layout');
  return data;
}