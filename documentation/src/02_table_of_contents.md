<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 02</div>
    <h1>Table of Contents</h1>
    <div class="chapter-subtitle">Structural Outline and Index of the Architecture Specifications</div>
</div>

Welcome to the **MS Family Technical Design &amp; Architecture Documentation**. Use the links below to navigate directly to each chapter section.

<ul class="toc-list">
    <li class="toc-item"><a href="#03_executive_summary">03. Executive Summary</a><div class="toc-leader"></div><span class="toc-page">4</span></li>
    <li class="toc-item"><a href="#04_project_overview">04. Project Overview</a><div class="toc-leader"></div><span class="toc-page">8</span></li>
    <li class="toc-item"><a href="#05_functional_requirements">05. Functional Requirements</a><div class="toc-leader"></div><span class="toc-page">12</span></li>
    <li class="toc-item"><a href="#06_non_functional_requirements">06. Non-Functional Requirements</a><div class="toc-leader"></div><span class="toc-page">19</span></li>
    <li class="toc-item"><a href="#07_system_architecture">07. System Architecture</a><div class="toc-leader"></div><span class="toc-page">25</span></li>
    <li class="toc-item"><a href="#08_c4_model">08. C4 Model Blueprint</a><div class="toc-leader"></div><span class="toc-page">31</span></li>
    <li class="toc-item"><a href="#09_high_level_architecture">09. High-Level Layered Architecture</a><div class="toc-leader"></div><span class="toc-page">38</span></li>
    <li class="toc-item"><a href="#10_low_level_architecture">10. Low-Level Component Design</a><div class="toc-leader"></div><span class="toc-page">44</span></li>
    <li class="toc-item"><a href="#11_database_design">11. Database Design &amp; ERD</a><div class="toc-leader"></div><span class="toc-page">52</span></li>
    <li class="toc-item"><a href="#12_database_schema">12. Database Physical Schema</a><div class="toc-leader"></div><span class="toc-page">58</span></li>
    <li class="toc-item"><a href="#13_user_flows">13. Core User Flows</a><div class="toc-leader"></div><span class="toc-page">68</span></li>
    <li class="toc-item"><a href="#14_application_flow">14. Application Lifecycle Flow</a><div class="toc-leader"></div><span class="toc-page">76</span></li>
    <li class="toc-item"><a href="#15_auth_flow">15. Authentication &amp; Lock Sequence</a><div class="toc-leader"></div><span class="toc-page">80</span></li>
    <li class="toc-item"><a href="#16_expense_flow">16. Expense &amp; OCR Ingestion Sequence</a><div class="toc-leader"></div><span class="toc-page">84</span></li>
    <li class="toc-item"><a href="#17_bill_reminder_flow">17. Bill Scheduler &amp; Alert Sequence</a><div class="toc-leader"></div><span class="toc-page">88</span></li>
    <li class="toc-item"><a href="#18_ai_assistant_flow">18. AI Assistant Reasoning Sequence</a><div class="toc-leader"></div><span class="toc-page">92</span></li>
    <li class="toc-item"><a href="#19_document_vault_flow">19. Secure Document Ingestion Sequence</a><div class="toc-leader"></div><span class="toc-page">96</span></li>
    <li class="toc-item"><a href="#20_vehicle_flow">20. Vehicle Service &amp; Alert Sequence</a><div class="toc-leader"></div><span class="toc-page">100</span></li>
    <li class="toc-item"><a href="#21_medicine_reminder_flow">21. Medication Reminder Sequence</a><div class="toc-leader"></div><span class="toc-page">104</span></li>
    <li class="toc-item"><a href="#22_api_documentation">22. REST API Specifications</a><div class="toc-leader"></div><span class="toc-page">108</span></li>
    <li class="toc-item"><a href="#23_security_architecture">23. Security &amp; Threat Architecture</a><div class="toc-leader"></div><span class="toc-page">118</span></li>
    <li class="toc-item"><a href="#24_frontend_architecture">24. Frontend Core Architecture</a><div class="toc-leader"></div><span class="toc-page">126</span></li>
    <li class="toc-item"><a href="#25_backend_architecture">25. Backend Core Architecture</a><div class="toc-leader"></div><span class="toc-page">131</span></li>
    <li class="toc-item"><a href="#26_state_management">26. State Management &amp; Persistence</a><div class="toc-leader"></div><span class="toc-page">135</span></li>
    <li class="toc-item"><a href="#27_devops_cicd">27. DevOps &amp; CI/CD Pipeline</a><div class="toc-leader"></div><span class="toc-page">139</span></li>
    <li class="toc-item"><a href="#28_deployment_architecture">28. Deployment Architecture Blueprint</a><div class="toc-leader"></div><span class="toc-page">143</span></li>
    <li class="toc-item"><a href="#29_scalability">29. Horizontal &amp; Vertical Scalability</a><div class="toc-leader"></div><span class="toc-page">146</span></li>
    <li class="toc-item"><a href="#30_performance_optimization">30. Performance Tuning &amp; Optimization</a><div class="toc-leader"></div><span class="toc-page">150</span></li>
    <li class="toc-item"><a href="#31_monitoring">31. Observability &amp; Monitoring</a><div class="toc-leader"></div><span class="toc-page">154</span></li>
    <li class="toc-item"><a href="#32_testing_strategy">32. Verification &amp; Testing Strategy</a><div class="toc-leader"></div><span class="toc-page">158</span></li>
    <li class="toc-item"><a href="#33_folder_structure">33. Codebase Directory Tree</a><div class="toc-leader"></div><span class="toc-page">162</span></li>
    <li class="toc-item"><a href="#34_environment_variables">34. Configuration &amp; Environments</a><div class="toc-leader"></div><span class="toc-page">166</span></li>
    <li class="toc-item"><a href="#35_design_system">35. Design System &amp; Tokens</a><div class="toc-leader"></div><span class="toc-page">170</span></li>
    <li class="toc-item"><a href="#36_uml_diagrams">36. UML Core Blueprints</a><div class="toc-leader"></div><span class="toc-page">174</span></li>
    <li class="toc-item"><a href="#37_adr">37. Architecture Decision Records (ADRs)</a><div class="toc-leader"></div><span class="toc-page">182</span></li>
    <li class="toc-item"><a href="#38_ai_architecture">38. AI &amp; LLM Engineering Pattern</a><div class="toc-leader"></div><span class="toc-page">188</span></li>
    <li class="toc-item"><a href="#39_future_roadmap">39. Product Evolution Roadmap</a><div class="toc-leader"></div><span class="toc-page">192</span></li>
    <li class="toc-item"><a href="#40_appendix">40. Appendix &amp; Bibliography</a><div class="toc-leader"></div><span class="toc-page">196</span></li>
</ul>
