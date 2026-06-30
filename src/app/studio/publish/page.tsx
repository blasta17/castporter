import { UploadWizard } from '@/components/UploadWizard';

export default function PublishPage() {
  return (
    <div className="page-wrap">
      <div className="page-head"><div><h1>Publish a video</h1><p>Upload once, choose your destinations and let CVP create the canonical record and platform copies.</p></div></div>
      <UploadWizard />
    </div>
  );
}
