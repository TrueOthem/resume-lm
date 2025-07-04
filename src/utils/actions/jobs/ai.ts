'use server';

import { generateObject, LanguageModelV1 } from 'ai';
import { z } from 'zod';
import { 
  simplifiedJobSchema, 
  simplifiedResumeSchema, 
} from "@/lib/zod-schemas";
import { Job, Resume } from "@/lib/types";
import { AIConfig } from '@/utils/ai-tools';
import { initializeAIClient } from '@/utils/ai-tools';
import { checkRateLimit } from '@/lib/rateLimiter';

export async function tailorResumeToJob(
  resume: Resume, 
  jobListing: z.infer<typeof simplifiedJobSchema>,
  config?: AIConfig
) {
// Default to pro plan and mock id, remove getSubscriptionPlan and plan
  const isPro = true;
  const id = "mock-user-id";
  const aiClient = isPro ? initializeAIClient(config, isPro, true) : initializeAIClient(config);
// Check rate limit
  await checkRateLimit(id);

try {
    // Defensive: Check for required fields
    if (!resume || typeof resume !== 'object') {
      console.error('[tailorResumeToJob] Invalid resume:', resume);
      throw new Error('Resume data is missing or invalid.');
    }
    if (!jobListing || typeof jobListing !== 'object') {
      console.error('[tailorResumeToJob] Invalid jobListing:', jobListing);
      throw new Error('Job description data is missing or invalid.');
    }

    // Always set target_role to job title
    const resumeForAI = {
      ...resume,
      target_role: jobListing.position_title || '',
    };

    // Log the inputs for debugging
    console.log('[tailorResumeToJob] Resume:', resumeForAI);
    console.log('[tailorResumeToJob] JobListing:', jobListing);
    if (config) console.log('[tailorResumeToJob] AI Config:', config);

    const { object } = await generateObject({
      model: aiClient as LanguageModelV1, 
      schema: z.object({
        content: simplifiedResumeSchema,
      }),
      system: `

You are ResumeLM, an advanced AI resume transformer that specializes in optimizing technical resumes for software engineering roles using machine-learning-driven ATS strategies. Your mission is to transform the provided resume into a highly targeted, ATS-friendly document that precisely aligns with the job description.

**Core Objectives:**

1. **Integrate Job-Specific Terminology & Reorder Content:**  
   - Replace generic descriptions with precise, job-specific technical terms drawn from the job description (e.g., "Generative AI," "Agentic AI," "LLMOps," "Azure OpenAI," "Azure Machine Learning Studio," etc.).
   - Reorder or emphasize sections and bullet points to prioritize experiences that most closely match the role's requirements.
   - Use strong, active language that mirrors the job description's vocabulary and focus.
   - Ensure all modifications are strictly based on the resume's original data—never invent new tools, versions, or experiences.

2. **STAR Framework for Technical Storytelling:**  
   For every bullet point describing work experience, structure the content as follows (using reasonable assumptions when needed without hallucinating details):
   - **Situation:** Briefly set the technical or business context (e.g., "During a cloud migration initiative…" or "When addressing the need for advanced generative AI solutions…").
   - **Task:** Define the specific responsibility or challenge aligned with the job's requirements (e.g., "To design and implement scalable AI models using Azure OpenAI…").
   - **Action:** Describe the technical actions taken, using job-specific verbs and detailed technology stack information (e.g., "Leveraged containerization with Docker and orchestrated microservices via Kubernetes to deploy models in a secure, scalable environment").
   - **Result:** Quantify the impact with clear, job-relevant metrics (e.g., "Achieved a 3.2x throughput increase" or "Reduced processing time by 80%").

3. **Enhanced Technical Detailing:**  
   - Convert simple technology lists into detailed, hierarchical representations that include versions and relevant frameworks (e.g., "Python → Python 3.10 (NumPy, PyTorch 2.0, FastAPI)").
   - Enrich work experience descriptions with architectural context and measurable performance metrics (e.g., "Designed event-driven microservices handling 25k RPS").
   - Use internal annotations (e.g., [JD: ...]) during processing solely as references. These annotations must be completely removed from the final output.

4. **Strict Transformation Constraints:**  
   - Preserve the original employment chronology and all factual details.
   - Maintain a 1:1 mapping between the job description requirements and the resume content.
   - If a direct match is missing, map the resume content to a relevant job description concept (e.g., "Legacy system modernization" → "Cloud migration patterns").
   - Every claim of improvement must be supported with a concrete, quantifiable metric.
   - Eliminate all internal transformation annotations (e.g., [JD: ...]) from the final output.

**Your Task:**  
Transform the resume according to these principles, ensuring the final output is a polished, ATS-optimized document that accurately reflects the candidate's technical expertise and directly addresses the job description—without any internal annotations.

IMPORTANT: Your output MUST include a field called "target_role" (string) inside the "content" object, and its value MUST be set to the job title (from the job description's "position_title" field). If "position_title" is missing, use the best available job title. Do not omit this field under any circumstances.

`,
prompt: `
    This is the Resume:
    ${JSON.stringify(resumeForAI, null, 2)}
    
    This is the Job Description:
    ${JSON.stringify(jobListing, null, 2)}
    `,
    });

    // Post-process: ensure target_role is present
    if (!object.content.target_role || typeof object.content.target_role !== 'string') {
      object.content.target_role = jobListing.position_title || '';
    }

    return object.content satisfies z.infer<typeof simplifiedResumeSchema>;
  } catch (error) {
    console.error('[tailorResumeToJob] Error tailoring resume:', error);
    if (error && typeof error === 'object' && 'stack' in error) {
      console.error('[tailorResumeToJob] Error stack:', error.stack);
    }
    // Log the inputs again for post-mortem
    console.error('[tailorResumeToJob] Resume input:', resume);
    console.error('[tailorResumeToJob] Job listing input:', jobListing);
    throw new Error(
      (error instanceof Error && error.message) ?
        `Failed to tailor resume: ${error.message}` :
        'Failed to tailor resume due to an unknown error.'
    );
  }
}

export async function formatJobListing(jobListing: string, config?: AIConfig) {
// Default to pro plan and mock id, remove getSubscriptionPlan and plan
  const isPro = true;
  const id = "mock-user-id";
  const aiClient = isPro ? initializeAIClient(config, isPro, true) : initializeAIClient(config);
// Check rate limit
  await checkRateLimit(id);

try {
    const { object } = await generateObject({
      model: aiClient as LanguageModelV1,
      schema: z.object({
        content: simplifiedJobSchema
      }),
      system: `You are an AI assistant specializing in structured data extraction from job listings. You have been provided with a schema
              and must adhere to it strictly. When processing the given job listing, follow these steps:
              IMPORTANT: For any missing or uncertain information, you must return an empty string ("") - never return "<UNKNOWN>" or similar placeholders.

            Read the entire job listing thoroughly to understand context, responsibilities, requirements, and any other relevant details.
            Perform the analysis as described in each TASK below.
            Return your final output in a structured format (e.g., JSON or the prescribed schema), using the exact field names you have been given.
            Do not guess or fabricate information that is not present in the listing; instead, return an empty string for missing fields.
            Do not include chain-of-thought or intermediate reasoning in the final output; provide only the structured results.
            
            For the description field:
            1. Start with 3-5 bullet points highlighting the most important responsibilities of the role.
               - Format these bullet points using markdown, with each point on a new line starting with "• "
               - These should be the most critical duties mentioned in the job listing
            2. After the bullet points, include the full job description stripped of:
               - Any non-job-related content
            3. Format the full description as a clean paragraph, maintaining proper grammar and flow.`,
      prompt: `Analyze this job listing carefully and extract structured information.

              TASK 1 - ESSENTIAL INFORMATION:
              Extract the basic details (company, position, URL, location, salary).
              For the description, include 3-5 key responsibilities as bullet points.

              TASK 2 - KEYWORD ANALYSIS:
              1. Technical Skills: Identify all technical skills, programming languages, frameworks, and tools
              2. Soft Skills: Extract interpersonal and professional competencies
              3. Industry Knowledge: Capture domain-specific knowledge requirements
              4. Required Qualifications: List education, and experience levels
              5. Responsibilities: Key job functions and deliverables

              Format the output according to the schema, ensuring:
              - Keywords as they are (e.g., "React.js" → "React.js")
              - Skills are deduplicated and categorized
              - Seniority level is inferred from context
              - Description contains 3-5 bullet points of key responsibilities
              Usage Notes:

              - If certain details (like salary or location) are missing, return "" (an empty string).
              - Adhere to the schema you have been provided, and format your response accordingly (e.g., JSON fields must match exactly).
              - Avoid exposing your internal reasoning.
              - DO NOT RETURN "<UNKNOWN>", if you are unsure of a piece of data, return an empty string.
              - FORMAT THE FOLLOWING JOB LISTING AS A JSON OBJECT: ${jobListing}`,
    });


    return object.content satisfies Partial<Job>;
  } catch (error) {
    console.error('Error formatting job listing:', error);
    // Log the raw jobListing input for debugging
    console.error('Job listing input:', jobListing);
    throw error;
  }
}

export async function rephraseAndCompleteJobDescription(rawDescription: string, config?: AIConfig): Promise<string> {
  
  // Default to pro plan and mock id, remove getSubscriptionPlan and plan
  const isPro = true;
  const id = "mock-user-id";
  const aiClient = isPro ? initializeAIClient(config, isPro, true) : initializeAIClient(config);
// Check rate limit
  await checkRateLimit(id);
  
  try {
    const { object } = await generateObject({
      model: aiClient as LanguageModelV1,
      schema: z.object({ content: z.string() }),
      system: `
        You are an expert job description and resume data generator.
        Your task is to rewrite the following job description in clear, structured English, and to fill in any missing key information with your best reasonable guess.
        Output a concise, well-structured job description that includes ALL the following fields, as required by the downstream Zod schemas:
        - Job Title (start with "Job Title: ...")
        - Company Name (start with "Company: ...")
        - Location (if available or can be inferred)
        - Key Responsibilities (as bullet points)
        - Key Requirements (as bullet points)
        - Description (a paragraph summary)
        - Salary Range (if available or can be inferred)
        - Work Location (remote, in_person, or hybrid)
        - Employment Type (full_time, part_time, co_op, internship, contract)
        - Keywords (comma-separated list of important skills, technologies, or requirements)
        - For resume tailoring, ensure the job title is also provided as the target_role field
        If any information is missing, make a plausible guess based on context, but do NOT invent unrealistic details.
        Your output MUST be structured so that all these fields can be extracted by a parser.
      `,
      prompt: rawDescription,
    });
    return object.content;
  } catch (error) {
    console.error('[rephraseAndCompleteJobDescription] Error:', error);
    throw new Error('Failed to rephrase and complete job description.');
  }
}