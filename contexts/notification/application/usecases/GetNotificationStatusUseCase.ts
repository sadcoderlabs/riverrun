/**
 * GetNotificationStatusUseCase - Get notification status for a wallet
 *
 * This use case handles fetching the notification status from the backend API.
 */

import type { NotificationApiPort, NotificationStatusResponse } from '../ports/notificationApiPort';

export interface GetNotificationStatusInput {
  walletAddress: string;
}

export class GetNotificationStatusUseCase {
  constructor(private notificationApiPort: NotificationApiPort) {}

  async execute(input: GetNotificationStatusInput): Promise<NotificationStatusResponse> {
    return this.notificationApiPort.getNotificationStatus(input.walletAddress);
  }
}
