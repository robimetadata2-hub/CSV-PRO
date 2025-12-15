// English language strings
export const en = {
  general: {
    appName: 'Photo Metadata Helper',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    save: 'Save',
    cancel: 'Cancel',
    submit: 'Submit',
    delete: 'Delete',
    edit: 'Edit',
    clearAll: 'Clear All',
    upgrade: 'Upgrade',
  },
  auth: {
    signIn: 'Sign In',
    signOut: 'Sign Out',
    signUp: 'Sign Up',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot Password?',
    googleSignIn: 'Sign in with Google',
  },
  sidebar: {
    modeSelection: 'Mode Selection',
    metadata: 'Metadata',
    imageToPrompt: 'Image to Prompt',
    customization: 'Metadata Customization',
    settings: 'SETTINGS',
  },
  customization: {
    minTitleWords: 'Min Title Words',
    maxTitleWords: 'Max Title Words',
    minKeywords: 'Min Keywords',
    maxKeywords: 'Max Keywords',
    minDescriptionWords: 'Min Description Words',
    maxDescriptionWords: 'Max Description Words',
  },
  features: {
    silhouette: 'SILHOUETTE',
    silhouetteDesc: 'When enabled, Gemini will:',
    customPrompt: 'CUSTOM PROMPT',
    customPromptDesc: 'When enabled, Gemini will use your custom prompt:',
    transparentBg: 'White Background',
    isolatedOnTransparentBg: 'Transparent Background',
    prohibitedWords: 'PROHIBITED WORDS',
    singleWordKeywords: 'SINGLE WORD KEYWORDS',
  },
  imageUploader: {
    dragDrop: 'Drag & drop files here',
    browse: 'Browse files',
    orSeparator: 'OR',
    supportedFormats: 'Supports: JPG, PNG, WEBP, GIF, SVG, EPS, MP4, MOV',
    generate: 'Generate Metadata',
  },
  platforms: {
    platforms: 'PLATFORMS:',
  },
  apiKey: {
    label: 'Gemini API Key',
    placeholder: 'Enter your Gemini API Key',
    saveKey: 'Save Key',
  },
};

// Function to get text based on the provided key path
export function getText(path: string, language: string = 'en'): string {
  const keys = path.split('.');
  let value: any = { en }[language];
  
  for (const key of keys) {
    if (value && key in value) {
      value = value[key];
    } else {
      console.warn(`Missing translation: ${path} for language ${language}`);
      return path; // Return the key path if translation is missing
    }
  }
  
  return value;
} 