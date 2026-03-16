import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Button } from './ui/button';
import { Megaphone } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useMyReferralOverview } from '@/hooks/use-referrals';
import { ReferralShareCard } from './referral-share-card';
import { cn } from '@/lib/utils';

interface Props {
  triggerClassName?: string;
}

export default function ReferralShareDialog({ triggerClassName }: Props) {
  const { data: session } = useSession();
  const referralQuery = useMyReferralOverview(!!session?.user);
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
        {referralQuery.data?.code ? (
          <ReferralShareCard code={referralQuery.data.code} compact />
        ) : (
          <p className="text-sm text-muted-foreground">
            Preparing your referral code...
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
