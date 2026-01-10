'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOrgAdmin } from './organizations';

export type EmployeeWithDetails = {
  id: string;
  profile_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  department: string | null;
  job_title: string | null;
  role: 'owner' | 'admin' | 'employee';
  annual_salary: number;
  tax_code: string;
  default_pension_percent: number;
  employer_pension_percent: number;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_sort_code: string | null;
  start_date: string | null;
  is_active: boolean;
};

// Check if current user is admin of the organization
async function requireOrgAdmin(orgId: string) {
  const isAdmin = await isOrgAdmin(orgId);
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }
}

// Get all employees with their details for an organization
export async function getEmployees(orgId: string): Promise<EmployeeWithDetails[]> {
  await requireOrgAdmin(orgId);
  const supabase = await createClient();

  // Get all members of the organization who are employees
  const { data: members, error: membersError } = await supabase
    .from('organization_members')
    .select(`
      profile_id,
      role,
      profiles:profile_id (
        id,
        email,
        full_name,
        avatar_url,
        department
      )
    `)
    .eq('organization_id', orgId)
    .eq('role', 'employee');

  if (membersError) {
    console.error('Error fetching members:', membersError);
    throw new Error('Failed to fetch employees');
  }

  // Get employee details for this org
  const { data: details, error: detailsError } = await supabase
    .from('employee_details')
    .select('*')
    .eq('organization_id', orgId);

  if (detailsError) {
    console.error('Error fetching employee details:', detailsError);
    throw new Error('Failed to fetch employee details');
  }

  const detailsMap = new Map(
    (details || []).map((d) => [d.profile_id, d])
  );

  // Combine data
  return (members || []).map((member) => {
    const profile = member.profiles as unknown as {
      id: string;
      email: string;
      full_name: string;
      avatar_url: string | null;
      department: string | null;
    };
    const empDetails = detailsMap.get(member.profile_id);

    return {
      id: empDetails?.id || '',
      profile_id: member.profile_id,
      email: profile?.email || '',
      full_name: profile?.full_name || '',
      avatar_url: profile?.avatar_url || null,
      department: profile?.department || null,
      job_title: empDetails?.job_title || null,
      role: member.role as 'owner' | 'admin' | 'employee',
      annual_salary: empDetails?.annual_salary ? Number(empDetails.annual_salary) : 0,
      tax_code: empDetails?.tax_code || '1257L',
      default_pension_percent: empDetails?.default_pension_percent ? Number(empDetails.default_pension_percent) : 5,
      employer_pension_percent: empDetails?.employer_pension_percent ? Number(empDetails.employer_pension_percent) : 3,
      bank_account_name: empDetails?.bank_account_name || null,
      bank_account_number: empDetails?.bank_account_number || null,
      bank_sort_code: empDetails?.bank_sort_code || null,
      start_date: empDetails?.start_date || null,
      is_active: empDetails?.is_active ?? true,
    };
  });
}

// Get a single employee by profile ID
export async function getEmployee(orgId: string, profileId: string): Promise<EmployeeWithDetails | null> {
  await requireOrgAdmin(orgId);
  const supabase = await createClient();

  // Get member with profile info
  const { data: member, error: memberError } = await supabase
    .from('organization_members')
    .select(`
      role,
      profiles:profile_id (
        id,
        email,
        full_name,
        avatar_url,
        department
      )
    `)
    .eq('organization_id', orgId)
    .eq('profile_id', profileId)
    .single();

  if (memberError || !member) {
    return null;
  }

  const profile = member.profiles as unknown as {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    department: string | null;
  };

  const { data: details } = await supabase
    .from('employee_details')
    .select('*')
    .eq('organization_id', orgId)
    .eq('profile_id', profileId)
    .single();

  return {
    id: details?.id || '',
    profile_id: profile.id,
    email: profile.email || '',
    full_name: profile.full_name || '',
    avatar_url: profile.avatar_url,
    department: profile.department,
    job_title: details?.job_title || null,
    role: member.role as 'owner' | 'admin' | 'employee',
    annual_salary: details?.annual_salary ? Number(details.annual_salary) : 0,
    tax_code: details?.tax_code || '1257L',
    default_pension_percent: details?.default_pension_percent ? Number(details.default_pension_percent) : 5,
    employer_pension_percent: details?.employer_pension_percent ? Number(details.employer_pension_percent) : 3,
    bank_account_name: details?.bank_account_name || null,
    bank_account_number: details?.bank_account_number || null,
    bank_sort_code: details?.bank_sort_code || null,
    start_date: details?.start_date || null,
    is_active: details?.is_active ?? true,
  };
}

// Create or update employee details
export async function upsertEmployeeDetails(
  orgId: string,
  profileId: string,
  data: {
    annual_salary: number;
    tax_code: string;
    default_pension_percent: number;
    employer_pension_percent: number;
    bank_account_name?: string;
    bank_account_number?: string;
    bank_sort_code?: string;
    start_date?: string;
    is_active?: boolean;
    department?: string;
    full_name?: string;
    job_title?: string;
  }
) {
  await requireOrgAdmin(orgId);
  const supabase = await createClient();

  // Update profile info if provided - use admin client to bypass RLS
  if (data.department !== undefined || data.full_name !== undefined) {
    const profileUpdate: Record<string, string> = {};
    if (data.department !== undefined) profileUpdate.department = data.department;
    if (data.full_name !== undefined) profileUpdate.full_name = data.full_name;

    const adminClient = createAdminClient();
    const { error: profileError } = await adminClient
      .from('profiles')
      .update(profileUpdate)
      .eq('id', profileId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      throw new Error('Failed to update profile');
    }
  }

  // Check if employee_details already exists for this org
  const { data: existing } = await supabase
    .from('employee_details')
    .select('id')
    .eq('organization_id', orgId)
    .eq('profile_id', profileId)
    .single();

  const detailsData = {
    organization_id: orgId,
    profile_id: profileId,
    annual_salary: data.annual_salary,
    tax_code: data.tax_code,
    default_pension_percent: data.default_pension_percent,
    employer_pension_percent: data.employer_pension_percent,
    bank_account_name: data.bank_account_name || null,
    bank_account_number: data.bank_account_number || null,
    bank_sort_code: data.bank_sort_code || null,
    start_date: data.start_date || null,
    is_active: data.is_active ?? true,
    job_title: data.job_title || null,
  };

  let error;
  if (existing) {
    // Update
    const result = await supabase
      .from('employee_details')
      .update(detailsData)
      .eq('organization_id', orgId)
      .eq('profile_id', profileId);
    error = result.error;
  } else {
    // Insert
    const result = await supabase
      .from('employee_details')
      .insert(detailsData);
    error = result.error;
  }

  if (error) {
    console.error('Error upserting employee details:', error);
    throw new Error('Failed to save employee details');
  }

  revalidatePath('/dashboard/[orgSlug]/admin/employees', 'page');
  return { success: true };
}

// Deactivate an employee (soft delete)
export async function deactivateEmployee(orgId: string, profileId: string) {
  await requireOrgAdmin(orgId);
  const supabase = await createClient();

  const { error } = await supabase
    .from('employee_details')
    .update({ is_active: false })
    .eq('organization_id', orgId)
    .eq('profile_id', profileId);

  if (error) {
    console.error('Error deactivating employee:', error);
    throw new Error('Failed to deactivate employee');
  }

  revalidatePath('/dashboard/[orgSlug]/admin/employees', 'page');
  return { success: true };
}

// Reactivate an employee
export async function reactivateEmployee(orgId: string, profileId: string) {
  await requireOrgAdmin(orgId);
  const supabase = await createClient();

  const { error } = await supabase
    .from('employee_details')
    .update({ is_active: true })
    .eq('organization_id', orgId)
    .eq('profile_id', profileId);

  if (error) {
    console.error('Error reactivating employee:', error);
    throw new Error('Failed to reactivate employee');
  }

  revalidatePath('/dashboard/[orgSlug]/admin/employees', 'page');
  return { success: true };
}

// Get employees without details (for adding new employees)
export async function getEmployeesWithoutDetails(orgId: string) {
  await requireOrgAdmin(orgId);
  const supabase = await createClient();

  // Get all employee members of the org
  const { data: members, error: membersError } = await supabase
    .from('organization_members')
    .select(`
      profile_id,
      profiles:profile_id (
        id,
        email,
        full_name
      )
    `)
    .eq('organization_id', orgId)
    .eq('role', 'employee');

  if (membersError) {
    throw new Error('Failed to fetch members');
  }

  // Get all profile IDs that have employee_details in this org
  const { data: details, error: detailsError } = await supabase
    .from('employee_details')
    .select('profile_id')
    .eq('organization_id', orgId);

  if (detailsError) {
    throw new Error('Failed to fetch employee details');
  }

  const profileIdsWithDetails = new Set(details?.map(d => d.profile_id) || []);

  // Filter to only profiles without details
  return (members || [])
    .filter(m => !profileIdsWithDetails.has(m.profile_id))
    .map(m => {
      const profile = m.profiles as unknown as { id: string; email: string; full_name: string };
      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
      };
    });
}
