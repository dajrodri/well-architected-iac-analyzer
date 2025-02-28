import { Box, Link, SpaceBetween, Button } from '@cloudscape-design/components';

export const helpContent = {
    default: {
        header: 'About Well-Architected IaC Analyzer',
        body: (
            <SpaceBetween size="xxs">
                <Box variant="p">
                    This tool helps you evaluate your infrastructure designs against AWS Well-Architected Framework best practices.
                </Box>

                <Box variant="h4">Key Features</Box>
                <ul>
                    <li><strong>IaC Analysis:</strong> Upload CloudFormation (YAML/JSON) or Terraform templates for automated analysis</li>
                    <li><strong>Architecture Review:</strong> Upload architecture diagrams (PNG/JPG) and get IaC recommendations</li>
                    <li><strong>Well-Architected Integration:</strong> Directly update your AWS Well-Architected Tool workload</li>
                    <li><strong>AI-Powered Analysis:</strong> Get detailed recommendations using AWS Bedrock</li>
                </ul>
                <Box variant="h4">How to Use</Box>
                <ol>
                    <li>Upload your IaC template or architecture diagram</li>
                    <li>Select the Well-Architected pillars to review</li>
                    <li>Optionally provide a Well-Architected Tool workload ID</li>
                    <li>Review the analysis results and recommendations</li>
                    <li>Update your Well-Architected Tool workload or generate IaC templates</li>
                </ol>

                <Box variant="h4">Need Help?</Box>
                <Box variant="p">
                    Look for the help icons (<Button variant="inline-icon" iconName="support" />) throughout the application for detailed information about specific features.
                </Box>

                <Box variant="h4">Additional Resources</Box>
                <SpaceBetween size="xs">
                    <Link external href="https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html">
                        AWS Well-Architected Framework Documentation
                    </Link>
                    <Link external href="https://docs.aws.amazon.com/wellarchitected/latest/userguide/getting-started.html">
                        Getting Started with AWS Well-Architected Tool
                    </Link>
                </SpaceBetween>
            </SpaceBetween>
        )
    },
    fileUpload: {
        header: 'File Upload',
        body: (
            <SpaceBetween size="xxs">
                <Box variant="p">
                    Upload your Infrastructure as Code (IaC) template or architecture diagram for analysis:
                </Box>
                <ul>
                    <li>Supported IaC formats: YAML, JSON (CloudFormation), and Terraform (.tf)</li>
                    <li>Supported image formats: PNG, JPG, JPEG</li>
                    <li>Maximum file size: 50MB</li>
                </ul>
                <Box variant="p">
                    When uploading an architecture diagram, you can later generate IaC templates based on the analysis.
                </Box>
            </SpaceBetween>
        )
    },
    pillarSelection: {
        header: 'Well-Architected Pillars',
        body: (
            <SpaceBetween size="xxs">
                <Box variant="p">
                    Select which Well-Architected Framework pillars to include in your analysis:
                </Box>
                <ul>
                    <li>Operational Excellence: Operations as code, observability, etc.</li>
                    <li>Security: Identity management, data protection, incident response</li>
                    <li>Reliability: Recovery planning, adapting to changes, etc.</li>
                    <li>Performance Efficiency: Resource optimization, monitoring</li>
                    <li>Cost Optimization: Cost-effective resources, expenditure awareness</li>
                    <li>Sustainability: Environmental impact reduction strategies</li>
                </ul>
                <Link external href="https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html">
                    Learn more about Well-Architected pillars
                </Link>
            </SpaceBetween>
        )
    },
    analysisResults: {
        header: 'Analysis Results',
        body: (
            <SpaceBetween size="xxs">
                <Box variant="p">
                    Review the analysis of your infrastructure against Well-Architected best practices:
                </Box>
                <ul>
                    <li>View applied and not applied best practices. Use the table filters and preferences to customize your view.</li>
                    <li><strong>Get More Details:</strong> Get in-depth analysis and recommendations for selected best practices</li>
                    <li><strong>Generate IaC Document:</strong> Convert architecture diagrams into infrastructure code (Available only for image uploads)</li>
                    <li><strong>Download Analysis:</strong> Export all findings and recommendations as a CSV file</li>
                </ul>
            </SpaceBetween>
        )
    },
    wellArchitectedTool: {
        header: 'Well-Architected Tool Integration',
        body: (
            <SpaceBetween size="xxs">
                <Box variant="p">
                    Track and manage your workload's alignment with AWS Well-Architected Framework:
                </Box>
                <ul>
                    <li>View risk summary across all pillars</li>
                    <li>Track high and medium risks</li>
                    <li>Generate Well-Architected Tool reports</li>
                </ul>

                <Box variant="h4">
                    Important: Workload Management
                </Box>
                <ul>
                    <li><strong>Complete Well-Architected Tool Review:</strong>
                        <ul>
                            <li>If you provided an existing Workload ID in Optional Settings: Updates will be made to that workload</li>
                            <li>If no Workload ID was provided: A new workload will be created automatically</li>
                        </ul>
                    </li>
                    <li><strong>Delete Well-Architected Tool Workload:</strong>
                        <ul>
                            <li>Only available for workloads created by this tool</li>
                            <li>Not available for existing workloads (where you provided the Workload ID)</li>
                            <li>Use this to clean up temporary workloads created during your analysis</li>
                        </ul>
                    </li>
                </ul>

                <Box variant="p">
                    <strong>Note:</strong> For security reasons, this tool cannot delete Well-Architected workloads that were not created by it.
                    If you provided your own Workload ID, you'll need to manage that workload directly in the AWS Console.
                </Box>

                <Link external href="https://docs.aws.amazon.com/wellarchitected/latest/userguide/workloads.html">
                    Learn more about managing Well-Architected workloads
                </Link>
            </SpaceBetween>
        )
    },
    iacDocument: {
        header: 'IaC Document',
        body: (
            <SpaceBetween size="xxs">
                <Box variant="p">
                    View and manage generated Infrastructure as Code documents:
                </Box>
                <ul>
                    <li>Review generated IaC templates</li>
                    <li>Copy content to clipboard</li>
                    <li>Download as file</li>
                </ul>
                <Box variant="p">
                    Templates are generated following AWS best practices and Well-Architected recommendations.
                </Box>
            </SpaceBetween>
        )
    },
    workloadId: {
        header: 'Well-Architected Workload ID',
        body: (
            <SpaceBetween size="xxs">
                <Box variant="p">
                    The Workload ID connects your analysis with AWS Well-Architected Tool:
                </Box>
                <ul>
                    <li>Optional: Leave empty to create a new workload</li>
                    <li>Enter existing ID to update an existing workload</li>
                    <li>Found in AWS Well-Architected Tool console</li>
                </ul>
                <Link external href="https://docs.aws.amazon.com/wellarchitected/latest/userguide/define-workload.html">
                    Learn more about Well-Architected workloads
                </Link>
            </SpaceBetween>
        )
    },
    iacTypeSelection: {
        header: 'IaC Template Type Selection',
        body: (
            <SpaceBetween size="xxs">
                <Box variant="p">
                    Choose the type of Infrastructure as Code template to generate:
                </Box>
                <ul>
                    <li><strong>CloudFormation YAML:</strong> Generate AWS CloudFormation template in YAML format</li>
                    <li><strong>CloudFormation JSON:</strong> Generate AWS CloudFormation template in JSON format</li>
                    <li><strong>Terraform:</strong> Generate HashiCorp Terraform configuration files</li>
                </ul>
                <Box variant="p">
                    This option is only available when analyzing architecture diagrams.
                </Box>
            </SpaceBetween>
        )
    }
};