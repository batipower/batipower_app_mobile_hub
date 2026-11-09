export const DEPLOYMENT_ROOT_KEY = ['hub-deployment'] as const;

export const deploymentKey = (reference: string) => ['hub-deployment', reference] as const;
