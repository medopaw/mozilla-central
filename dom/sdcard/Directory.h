/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "mozilla/Attributes.h"
#include "mozilla/ErrorResult.h"
#include "nsCycleCollectionParticipant.h"
#include "nsWrapperCache.h"

#include "Entry.h"

struct JSContext;

namespace mozilla {
namespace dom {
namespace sdcard {

struct FileInfo;

class Directory MOZ_FINAL : public Entry
{
public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS(Directory)

public:
  explicit Directory(const FileInfo& aInfo);

  ~Directory();

  virtual JSObject* WrapObject(JSContext* aCx, JS::Handle<JSObject*> aScope);

  already_AddRefed<DirectoryReader> CreateReader();

  void GetFile(const nsAString& path, const FileSystemFlags& options,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void GetDirectory(const nsAString& path, const FileSystemFlags& options,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void RemoveRecursively(VoidCallback& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

private:
  void GetEntry(const nsAString& path, const FileSystemFlags& options,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback, bool isDirectory);
};

} // namespace sdcard
} // namespace dom
} // namespace mozilla
