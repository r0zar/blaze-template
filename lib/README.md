# Loading Resource Mechanism

This directory contains utilities for implementing loading states in the application.

## useLoadingResource

The `useLoadingResource.ts` file provides a mechanism for implementing React Suspense-based loading states. This allows components to show skeleton loading animations while data is being fetched.

### How it works

1. The `createLoadingResourceHook` function creates a hook factory that can be used to create loading resource hooks.
2. The loading resource hooks can be used to trigger Suspense by throwing a promise that resolves when the loading state changes.
3. The promises are cached to avoid creating new ones on each render.
4. When the loading state changes, the promises are resolved after a small delay to ensure smooth transitions.

### Usage

```tsx
// In your context provider
import { createLoadingResourceHook } from '@/lib/useLoadingResource';

// Set up loading resource hook
const { createLoadingEffect, createUseLoadingResource } = createLoadingResourceHook();

// Create the loading effect (typically in a context provider)
createLoadingEffect(isLoading);

// Create the loading resource hook
const useLoadingResource = createUseLoadingResource(isLoading, 'prefix');

// Expose the hook through your context
const contextValue = {
  // ...other values
  useLoadingResource,
};

// In your component
function MyComponent() {
  const { useLoadingResource } = useMyContext();
  
  // Use the loading resource to trigger Suspense
  useLoadingResource('resourceKey');
  
  // If this line is reached, the data is loaded
  return <div>Data loaded!</div>;
}

// In your app
<Suspense fallback={<LoadingSkeleton />}>
  <MyComponent />
</Suspense>
```

### Benefits

- **Centralized loading state**: The loading state is managed in one place
- **Reusable loading mechanism**: The loading resource mechanism can be reused across different components
- **Consistent loading experience**: All components use the same loading mechanism
- **Cleaner component code**: Components no longer need to implement their own loading logic
- **Better performance**: The loading promises are cached to avoid creating new ones on each render

### API

#### `createLoadingResourceHook()`

Creates a loading resource hook factory.

Returns:
- `createLoadingEffect`: A function that creates an effect to resolve promises when loading state changes
- `createUseLoadingResource`: A function that creates a hook to use a loading resource for Suspense

#### `createLoadingEffect(isLoading: boolean)`

Creates an effect to resolve promises when loading state changes.

Parameters:
- `isLoading`: Current loading state

#### `createUseLoadingResource(isLoading: boolean, prefix?: string)`

Creates a hook to use a loading resource for Suspense.

Parameters:
- `isLoading`: Current loading state
- `prefix`: Prefix for the resource key (default: 'resource')

Returns:
- A function that can be used to trigger Suspense

#### `clearLoadingResources()`

Clears all loading resources from the cache. Useful for testing or when you need to reset the loading state. 