export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: "Business" | "Academic" | "Creative" | "Social";
  content: string;
  icon: string;
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "press-release",
    name: "Press Release",
    description: "Standard corporate announcement format with boilerplate.",
    category: "Business",
    icon: "Megaphone",
    content: `<h1>FOR IMMEDIATE RELEASE</h1>
<p><strong>[City, State]</strong> — [Date]</p>
<h2>[Catchy Headline]</h2>
<p><strong>[CITY]</strong> — [Company Name] is proud to announce [Main News]. This development marks a significant milestone in [Industry/Field].</p>
<p>[Insert 2nd paragraph with details on features or benefits]</p>
<p>"[Insert a powerful quote from a CEO or stakeholder here]," says [Name], [Title] at [Company].</p>
<p>###</p>
<p><strong>About [Company]:</strong> [Insert brief company description and mission statement]. For more information, visit [Website].</p>
<p><strong>Media Contact:</strong><br/>[Name]<br/>[Email]<br/>[Phone]</p>`,
  },
  {
    id: "academic-essay",
    name: "Academic Essay",
    description: "Structured essay format with thesis and conclusion placeholders.",
    category: "Academic",
    icon: "GraduationCap",
    content: `<h2>[Title of Your Essay]</h2>
<p><strong>Introduction:</strong> [Hook the reader and provide background context. End with a strong thesis statement].</p>
<p><strong>Body Paragraph 1:</strong> [Topic sentence. Supporting evidence. Analysis and transition].</p>
<p><strong>Body Paragraph 2:</strong> [Topic sentence. Supporting evidence. Analysis and transition].</p>
<p><strong>Conclusion:</strong> [Restate thesis in a new way. Summarize main points. Final concluding thought].</p>
<p><strong>References:</strong></p>
<ul>
  <li>[Author Last Name, First Initial. (Year). Title. Publisher.]</li>
</ul>`,
  },
  {
    id: "linkedin-post",
    name: "LinkedIn Thought Leadership",
    description: "Engaging social media post with hook and CTA.",
    category: "Social",
    icon: "Linkedin",
    content: `<p>🚀 [Strong Hook: Share a surprising statistic or a recent win]</p>
<p>I've spent the last [Time] thinking about [Topic]. Here's the one thing most people get wrong:</p>
<p>1️⃣ [Key Point 1]<br/>2️⃣ [Key Point 2]<br/>3️⃣ [Key Point 3]</p>
<p>The lesson? [Summary of takeaway].</p>
<p>What's your take on [Topic]? Let's discuss in the comments! 👇</p>
<p>#Writing #Innovation #FutureOfWork</p>`,
  },
  {
    id: "professional-email",
    name: "Professional Outreach",
    description: "Cold outreach or networking email template.",
    category: "Business",
    icon: "Mail",
    content: `<p>Subject: [Engaging Subject Line related to recipient's work]</p>
<p>Hi [Name],</p>
<p>I've been following your work at [Company/Project] and was particularly impressed by [Specific Detail].</p>
<p>I'm reaching out because [Briefly state your purpose/value proposition]. I'd love to chat for 15 minutes about how we might [Collaborate/Help].</p>
<p>Do you have any availability later this week?</p>
<p>Best regards,</p>
<p>[Your Name]<br/>[Your Title/Link]</p>`,
  },
];
