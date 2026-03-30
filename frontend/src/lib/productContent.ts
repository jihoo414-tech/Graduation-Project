export const PRODUCT_BRAND_NAME = 'Medical Explain AI';
export const PRODUCT_WORKSPACE_NAME = 'Clinical Workspace';
export const PRODUCT_INTERPRETATION_WORKSPACE_NAME = 'Clinical interpretation workspace';

export const fallbackCancerType = 'Cancer type not specified';

export const formatCancerTypeLabel = (cancerType: string) => cancerType.trim() || fallbackCancerType;
