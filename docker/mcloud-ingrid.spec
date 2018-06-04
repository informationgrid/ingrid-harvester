%define ingrid_update_version 1.1.3.SNAPSHOT

%define mcloud_dir /opt/ingrid

%define mcloud_user ingrid 
%define mcloud_group ingrid 

%define __jar_repack %{nil}


Name:		mcloud-ingrid
Version: 	%ingrid_update_version
Release: 	1%{?dist}
Summary: 	mcloud InGrid Components

License:    GPL	
URL:		https://itpedia.dlz-it.de/display/mCloud
Source0:	mcloud-ingrid
BuildArch: 	noarch
AutoReqProv: no


Requires:	httpd java-1.8.0-oracle java-1.8.0-oracle-devel nodejs



%description
Mcloud InGrid Components.

#%build


%install
rm -rf %{buildroot}
mkdir -p %{buildroot}/%{mcloud_dir}
cp -rf %{SOURCE0}/* %{buildroot}/%{mcloud_dir}

%files
# %config(noreplace) %{mcloud_dir}/ingrid-iplug-ckan_bahn/conf/config.override.properties
%attr(0755,%{mcloud_user},%{mcloud_group}) %{mcloud_dir}

%pre
# First delete the lib and work directory for each updated component
rm -rf %{mcloud_dir}/ingrid-iplug-ckan_bahn/lib/*
rm -rf %{mcloud_dir}/ingrid-iplug-ckan_bahn/webapp/WEB-INF/work/*

rm -rf %{mcloud_dir}/ingrid-iplug-ckan_govdata.de/lib/*
rm -rf %{mcloud_dir}/ingrid-iplug-ckan_govdata.de/webapp/WEB-INF/work/*

rm -rf %{mcloud_dir}/ingrid-iplug-csw-dsc_bfg/lib/*
rm -rf %{mcloud_dir}/ingrid-iplug-csw-dsc_bfg/webapp/WEB-INF/work/*

rm -rf %{mcloud_dir}/ingrid-iplug-csw-dsc_wsv/lib/*
rm -rf %{mcloud_dir}/ingrid-iplug-csw-dsc_wsv/webapp/WEB-INF/work/*


%changelog
* Thu May 17 2018 Andre Wallat <andre.wallat@wemove.com> - 1.1.2
- fix excel import with nodejs 6

* Wed May 02 2018 Andre Wallat <andre.wallat@wemove.com> - 1.1.1
- add mFund-FKZ to index

* Fri Apr 06 2018 Andre Wallat <andre.wallat@wemove.com> - 1.1.0
- support for decompound plugin when indexing into elasticsearch
- add WCS type
- bundle application for production

* Mon Feb 12 2018 Andre Wallat <andre.wallat@wemove.com> - 1.0.10
- Add temporal coverage of data to index.
- recognize new category data-run

* Thu Jan 25 2018 Andre Wallat <andre.wallat@wemove.com> - 1.0.9.1
- excel-importer: fixed configuration of new index

* Fri Jan 19 2018 Andre Wallat <andre.wallat@wemove.com> - 1.0.9
- excel-importer: support multiple authors and license URLs
- excel-importer: add WCS download link
- excel-importer: support decompound plugin for stemming

* Thu Jan 27 2017 André Wallat <andre.wallat@wemove.com> - 1.0.4
- excel-importer: fixed import of multiple download URLs

* Fri Dec 22 2016 Joachim Mueller <joachim.mueller@wemove.com> - 1.0.3
- excel-importer: update new excel data from 2016-12-20

* Fri Dec 16 2016 Joachim Mueller <joachim.mueller@wemove.com> - 1.0.2
- excel-importer: update new excel data from 2016-12-15
- excel-importer: import new columns for links to license and author

* Wed Dec 14 2016 André Wallat <andre.wallat@wemove.com> - 1.0.1
- updated mapping for elasticsearch

* Wed Nov 30 2016 André Wallat <andre.wallat@wemove.com> - 1.0.0
- initial installation
