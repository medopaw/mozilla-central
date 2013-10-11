/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_filesystemrequestparent_h__
#define mozilla_dom_filesystemrequestparent_h__

#include "mozilla/dom/filesystem/PFilesystemRequestParent.h"
#include "mozilla/dom/ContentChild.h"
#include "mozilla/dom/ContentParent.h"
#include "nsThreadUtils.h"

namespace mozilla {
namespace dom {
namespace filesystem {

class FilesystemEvent;

class FilesystemRequestParent : public PFilesystemRequestParent
{
public:
  FilesystemRequestParent(const FilesystemParams& aParams);
  ~FilesystemRequestParent();

  NS_IMETHOD_(nsrefcnt) AddRef();
  NS_IMETHOD_(nsrefcnt) Release();

  void Dispatch();
  void ActorDestroy(ActorDestroyReason) MOZ_OVERRIDE;
private:
  ThreadSafeAutoRefCnt mRefCnt;
  NS_DECL_OWNINGTHREAD
  FilesystemParams mParams;
};

} // namespace filesystem
} // namespace dom
} // namespace mozilla

#endif // mozilla_dom_filesystemrequestparent_h__
