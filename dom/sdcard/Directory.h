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
#include "mozilla/dom/Future.h"

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

  void CreateFile(const nsAString& path,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void CreateDirectory(const nsAString& name,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void Get(const nsAString& path,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void Rename (const nsAString& oldName, const nsAString& newName,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void Move(const nsAString& entry, const nsAString& newName,
      const Optional<NonNull<mozilla::dom::sdcard::Directory> >& newParent,
      const Optional<OwningNonNull<EntryCallback> >& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void Move(mozilla::dom::sdcard::Directory& entry, const nsAString& newName,
      const Optional<NonNull<mozilla::dom::sdcard::Directory> >& newParent,
      const Optional<OwningNonNull<EntryCallback> >& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void Copy(const nsAString& entry, const nsAString& newName,
      const Optional<NonNull<mozilla::dom::sdcard::Directory> >& newParent,
      const Optional<OwningNonNull<EntryCallback> >& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void Copy(mozilla::dom::sdcard::Directory& entry, const nsAString& newName,
      const Optional<NonNull<mozilla::dom::sdcard::Directory> >& newParent,
      const Optional<OwningNonNull<EntryCallback> >& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void Remove(const nsAString& entry, VoidCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void Remove(mozilla::dom::sdcard::Directory& entry, VoidCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void RemoveDeep(const nsAString& entry, VoidCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void RemoveDeep(mozilla::dom::sdcard::Directory& entry, VoidCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void GetFile(const nsAString& path, const FileSystemFlags& options,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  already_AddRefed<mozilla::dom::Future> GetFile(const nsAString& path,
      const FileSystemFlags& options);

  void GetDirectory(const nsAString& path, const FileSystemFlags& options,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void Enumerate (EntriesCallback& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void EnumerateDeep (EntriesCallback& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void RemoveRecursively(VoidCallback& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

private:
  void GetEntry(const nsAString& path, const FileSystemFlags& options,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback,
      bool isDirectory);

  void EnumerateInternal(bool aDeep, EntriesCallback& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void RemoveInternal(const nsAString& path, bool deep, VoidCallback& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);
};

} // namespace sdcard
} // namespace dom
} // namespace mozilla
