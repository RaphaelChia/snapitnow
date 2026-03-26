import { cn } from '@/lib/utils';
import { Megaphone } from 'lucide-react';
import { useState } from 'react';
import { ReferralShareCard } from './referral-share-card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

interface Props {
  triggerClassName?: string;
}

export default function ReferralShareDialog({ triggerClassName }: Props) {
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);

  return (
    <Dialog
      open={referralDialogOpen}
      onOpenChange={setReferralDialogOpen}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="link"
          className={cn("h-fit gap-1.5 p-0 sm:inline-flex", triggerClassName)}
        >
          <Megaphone className="size-3.5" />
          Refer & save 15%
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Refer a friend</DialogTitle>

        </DialogHeader>
        <ReferralShareCard compact />

      </DialogContent>
    </Dialog>
  )
}
